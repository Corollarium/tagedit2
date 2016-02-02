/*
* Tagedit - jQuery Plugin
* The Plugin can be used to edit tags from a database the easy way
*
* Examples and documentation at: tagedit.webwork-albrecht.de
*
* Copyright (c) 2010 Oliver Albrecht <info@webwork-albrecht.de>
*
* License:
* This work is licensed under a MIT License
* http://www.opensource.org/licenses/mit-license.php
*
* @author Oliver Albrecht Mial: info@webwork-albrecht.de Twitter: @webworka
* @version 1.2.1 (11/2011)
* Requires: jQuery v1.4+, jQueryUI v1.8+, jQuerry.autoGrowInput
*
* Example of usage:
*
* $( "input.tag" ).tagedit();
*
* Possible options:
*
*  deleteEmptyItems: true, // Deletes items with empty value
*  additionalListClass: '', // put a classname here if the wrapper ul shoud receive a special class
*  allowEdit: true, // Switch on/off edit entries
*  allowAdd: true, // switch on/off the creation of new entries
*  direction: 'ltr' // Sets the writing direction for Outputs and Inputs
*  autocompleteOptions: {}, // Setting Options for the jquery UI Autocomplete (http://jqueryui.com/demos/autocomplete/)
*  breakKeyCodes: [ 13, 44 ], // Sets the characters to break on to parse the tags (defaults: return, comma)
*  texts: { // some texts
*      removeLinkTitle: 'Remove from list.',
*      saveEditLinkTitle: 'Save changes.',
*      breakEditLinkTitle: 'Cancel'
*  }
*
* Callbacks:
*
*  beforeAppend:
*   triggered right before the append of a tag element. params: $li, element_id, value, basename
*
*  beforeSave:
*      callback triggered when a new tag is being created, it receives the tag value as a parameter and should return
*   a tag value as a result, if an empty string (or a coerced false value) is returned then the tag will not be created.
*
*  beforeRemove:
*      Called right before a tag the removal of the <li> of a tag. params: $li
*
* Events:
*
*  transformToTag: triggered during the process of creation of a new tag (or when you select one from the autocomplete)
*/

(function($) {

	$.fn.tagedit = function(options) {
		// cache tags already found with ajax
		var FOUND_TAGS = {};


		/**
		* Merge Options with defaults
		*/
		options = $.extend(true, {
			// default options here
            checkToDeleteURL: null,
			additionalListClass: '',
			allowEdit: true,
			allowAdd: true,
			direction: 'ltr',
			autocompleteOptions: {
				select: function(event, ui) {
					$(this).val(ui.item.value).trigger('transformToTag', [ui.item.id]);
					return false;
				},
				response: function(event, ui) {
					ui.content.forEach(function(obj) {
						FOUND_TAGS[obj.value] = obj;
					});
				}
			},
			breakKeyCodes: [ 13, 44 ],
			texts: {
				removeLinkTitle: 'Remove from list.',
				saveEditLinkTitle: 'Save changes.',
				deleteLinkTitle: 'Delete this tag from database.',
				deleteConfirmation: 'Are you sure to delete this entry?',
				deletedElementTitle: 'This Element will be deleted.',
				breakEditLinkTitle: 'Cancel',
                forceDeleteConfirmation: 'There are more records using this tag, are you sure do you want to remove it?'
			},

			beforeSave: function(tag) {
				return tag;
			},

			beforeRemove: function($li) {
				return true;
			},

			beforeAppend: function($li, elementId, value, baseName) {
				return $li;
			}
		}, options || {});

		// no action if there are no elements
		if(this.length == 0) {
			return;
		}

		// Set the direction of the inputs
		var direction = this.attr('dir');
		if(direction && direction.length > 0) {
			options.direction = this.attr('dir');
		}

		var $originalInputs = this;

		var baseNameRegexp = new RegExp("^(.*)\\[([0-9]*?)?\]$", "i");

		var baseName = $originalInputs.eq(0).attr('name').match(baseNameRegexp);
		if(baseName && baseName.length == 3) {
			baseName = baseName[1];
		}
		else {
			// Elementname does not match the expected format, exit
			alert('elementname dows not match the expected format (regexp: '+baseNameRegexp+')')
			return;
		}

		// will be created in the following auto-executable function (inputsToList)
		var $tageditListUl = $();

		/**
		 * Init elements (auto called)
		 * Creates the tageditinput from a list of textinputs
		 */
		(function inputsToList() {
			var html = $('<ul class="tagedit-list ' + options.additionalListClass + '">');

			$originalInputs.each(function() {
				var element_name = $(this).attr('name').match(baseNameRegexp);
				if(element_name && element_name.length == 3
					&& (options.deleteEmptyItems == false || $(this).val().length > 0)
					&& element_name[1].length > 0
				) {
					var elementId = typeof element_name[2] != 'undefined'? element_name[2]: '';
					var value = this.value;

					var innHtml = '<li class="tagedit-listelement tagedit-listelement-old" data-tagedit-fromdb="true" >';
					innHtml += '<span dir="' + options.direction + '">' + value + '</span>';
					innHtml += '<input type="hidden" name="' + baseName + '[' + elementId + ']" value="' + value + '" />';
					innHtml += '<a class="tagedit-close" title="' + options.texts.removeLinkTitle + '">x</a>';
					innHtml += '</li>';
					html.append(
						options.beforeAppend($(innHtml), elementId, value, baseName)
					);
				}
			});

			// replace Elements with the list and save the list in the local variable elements
			$originalInputs.last().after(html)
			$tageditListUl = $originalInputs.last().next();
			$originalInputs.remove();

			// put an input field at the End
			// Put an empty element at the end
			html = '<li class="tagedit-listelement tagedit-listelement-new">';
			html += '<input type="text" name="' + baseName + '[]" value="" disabled="disabled" class="tagedit-input tagedit-input-disabled" dir="' + options.direction + '"/>';
			html += '</li>';
			html += '</ul>';

			$tageditListUl.append(html).find('.tagedit-input').each(function() { // Set function on the input
				var that = this;
				$(this).autoGrowInput({comfortZone: 15, minWidth: 15, maxWidth: 20000});

				// Event is triggert in case of choosing an item from the autocomplete, or finish the input
				$(this).on('transformToTag', function(event, id) {
					var isFromDatabase = (typeof id != 'undefined' && (id.length > 0 || id > 0));

					var checkAutocomplete = isFromDatabase == true? false : true;
					// check if the Value ist new
					var isNewResult = isNew($(this).val(), checkAutocomplete);
					if(isNewResult[0] === true || (isNewResult[0] === false && typeof isNewResult[1] == 'string')) {

						if(isFromDatabase == false && typeof isNewResult[1] == 'string') {
							isFromDatabase = true;
							id = isNewResult[1];
						}

						if(options.allowAdd == true || isFromDatabase) {
							var newTagValue = options.beforeSave(this.value);
							if (newTagValue) {
								var name = isFromDatabase ?
									baseName + '[' + id + ']' : baseName + '[]';

								// Make a new tag in front the input
								var innHtml = '<li class="tagedit-listelement tagedit-listelement-old" ' +
									'data-tagedit-fromdb="' + (isFromDatabase ? 'true' : 'false') + '" >';
								innHtml += '<span dir="' + options.direction + '">' + newTagValue + '</span>';
								innHtml += '<input type="hidden" name="' + name + '" value="' + newTagValue + '"/>';
								innHtml += '<a class="tagedit-close" title="' + options.texts.removeLinkTitle + '">x</a>';
								innHtml += '</li>';

								var $newLi = options.beforeAppend($(innHtml), id, newTagValue, baseName);

								$(this.parentNode).before($newLi);
							}
						}
					}
					$(this).val('');

					// close autocomplete
					if(options.autocompleteOptions.source) {
						$(this).autocomplete( "close" );
					}

				}).keydown(function(event) {
					var code = event.keyCode > 0? event.keyCode : event.which;

					switch(code) {
						case 8: // BACKSPACE
							if($(this).val().length == 0) {
								// delete Last Tag
								var $li = $tageditListUl.find('li.tagedit-listelement-old');
								if (options.beforeRemove($li)) {
									$tageditListUl.find('li.tagedit-listelement-old').last().remove();
								}
								event.preventDefault();
								return false;
							}
							break;
						case 9: // TAB
							if($(this).val().length > 0 && $('ul.ui-autocomplete #ui-active-menuitem').length == 0) {
								$(this).trigger('transformToTag');
								event.preventDefault();
								return false;
							}
						break;
					}
					return true;
				}).keypress(function(event) {
					var code = event.keyCode > 0? event.keyCode : event.which;
					if($.inArray(code, options.breakKeyCodes) > -1) {
						if($(this).val().length > 0 && $('ul.ui-autocomplete #ui-active-menuitem').length == 0) {
							$(this).trigger('transformToTag');
						}
					event.preventDefault();
					return false;
					}
					return true;
				}).on('paste', function(e){
					var that = $(this);
					if (e.type == 'paste'){
						setTimeout(function(){
							that.trigger('transformToTag');
						}, 1);
					}
				}).on('blur', function() {
					if(this.value.length == 0) {
						// disable the field to prevent sending with the form
						$(this).attr('disabled', 'disabled').addClass('tagedit-input-disabled');
					}
					else {
						$(this).trigger('transformToTag');
					}
				});

				if(options.autocompleteOptions.source != false) {
					$(this).autocomplete(options.autocompleteOptions);
				}
			}).end().click(function(event) {
				switch(event.target.tagName) {
					case 'A':
						var $li = $(event.target).parent();
						if (options.beforeRemove($li)) {
							$li.remove();
						}
						$(this).find('.tagedit-input').click();
						break;
					case 'INPUT':
					case 'SPAN':
					case 'LI':
						if($(event.target).hasClass('tagedit-listelement-deleted') == false &&
						$(event.target).parent('li').hasClass('tagedit-listelement-deleted') == false) {
							// Don't edit an deleted Items
							return doEdit(event);
						}
					default:
						$(this).find('.tagedit-input')
							.removeAttr('disabled')
							.removeClass('tagedit-input-disabled')
							.focus();
				}
				return false;
			});
		})();

		/**
		* Sets all Actions and events for editing an Existing Tag.
		*
		* @param event {object} The original Event that was given
		* return {boolean}
		*/
		function doEdit(event) {
			if(options.allowEdit == false) {
				// Do nothing
				return;
			}

			var $element = event.target.tagName == 'SPAN'? $(event.target).parent() : $(event.target);

			var closeTimer = null;

			// Event that is fired if the User finishes the edit of a tag
			$element.on('finishEdit', function(event, doReset) {
				window.clearTimeout(closeTimer);

				var textfield = $(this).find(':text');
				var isNewResult = isNew(textfield.val(), true);
				if(textfield.val().length > 0 && (typeof doReset == 'undefined' || doReset === false) && (isNewResult[0] == true)) {
					// This is a new Value and we do not want to do a reset. Set the new value
					$(this).find(':hidden').val(textfield.val());
					$(this).find('span').html(textfield.val());
				}

				textfield.remove();
				$(this).find('a.tagedit-save, a.tagedit-break').remove(); // Workaround. This normaly has to be done by autogrow Plugin
				$(this).removeClass('tagedit-listelement-edit').off('finishEdit');
				return false;
			});

			var hidden = $element.find(':hidden');
			html = '<input type="text" name="tmpinput" autocomplete="off" value="'+hidden.val()+'" class="tagedit-edit-input" dir="'+options.direction+'"/>';
			html += '<a class="tagedit-save" title="'+options.texts.saveEditLinkTitle+'">o</a>';
			html += '<a class="tagedit-break" title="'+options.texts.breakEditLinkTitle+'">x</a>';

			hidden.after(html);
			$element.addClass('tagedit-listelement-edit').find('a.tagedit-save').click(function() {
				$(this).parent().trigger('finishEdit');
				return false;
			}).end().find('a.tagedit-break').click(function() {
				$(this).parent().trigger('finishEdit', [true]);
				return false;
			}).end().find(':text').focus().autoGrowInput({comfortZone: 10, minWidth: 15, maxWidth: 20000})
				.keypress(function(event) {
					switch(event.keyCode) {
						case 13: // RETURN
							event.preventDefault();
							$(this).parent().trigger('finishEdit');
							return false;
						case 27: // ESC
							event.preventDefault();
							$(this).parent().trigger('finishEdit', [true]);
							return false;
					}
					return true;
				}).blur(function() {
					var that = $(this);
					closeTimer = window.setTimeout(function() {that.parent().trigger('finishEdit', [true])}, 500);
				});
		}

		/**
		* Checks if a tag is already choosen.
		*
		* @param value {string}
		* @param checkAutocomplete {boolean} optional Check also the autocomplet values
		* @returns {Array} First item is a boolean, telling if the item should be put to the list, second is optional the ID from autocomplete list
		*/
		function isNew(value, checkAutocomplete) {
            checkAutocomplete = typeof checkAutocomplete == 'undefined'? false : checkAutocomplete;
			var autoCompleteId = null;

            var compareValue = value;

			var isNew = true;
			$tageditListUl.find('li.tagedit-listelement-old input:hidden').each(function() {
				if(this.value == compareValue) {
					isNew = false;
				}
			});

			if (isNew == true && checkAutocomplete == true && options.autocompleteOptions.source != false) {
				var result = [];
				if ($.isArray(options.autocompleteOptions.source)) {
					result = options.autocompleteOptions.source;
				}
                else if ($.isFunction(options.autocompleteOptions.source)) {
					options.autocompleteOptions.source({term: value}, function (data) {
						result = data
					});
				}
                else if (typeof options.autocompleteOptions.source === "string") {
					var found = FOUND_TAGS[value];
					if (found) {
						result = [{value: found.value, id: found.id}];
					}
					else {
						// Check also autocomplete values
						var autocompleteURL = options.autocompleteOptions.source;
						if (autocompleteURL.match(/\?/)) {
							autocompleteURL += '&';
						} else {
							autocompleteURL += '?';
						}
						autocompleteURL += 'term=' + value;
						$.ajax({
							url: autocompleteURL,
							dataType: 'json',
							async: false
						}).done(function(data, textStatus, XMLHttpRequest) {
							result = data;
							for (var i in result) {
								FOUND_TAGS[result[i].value] = result[i];
							}
						});
					}
				}

				// If there is an entry for that already in the autocomplete, don't use it
				for (var i=0; i<result.length; i++) {
                    var label = result[i].value;
					if (label == compareValue) {
						isNew = false;
						autoCompleteId = result[i].id;
						break;
					}
				}
			}

			return [isNew, autoCompleteId];
		}

		return $tageditListUl;
	}
})(jQuery);
