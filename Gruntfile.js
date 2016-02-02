module.exports = function(grunt) {

	// Project configuration.
    grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		uglify: {
            options: {
                mangle: true,
                squeeze: true,
                codegen: true,
                banner: '/** License:' +
                    '* This work is licensed under a MIT License' +
                    '* http://www.opensource.org/licenses/mit-license.php */\n'
            },
            jsFiles: {
                src: ['js/jquery.autoGrowInput.js', 'js/jquery.tagedit.js'],
                dest: 'dist/jquery.tagedit.min.js'
            }
        },
        cssmin: {
            target: {
                files: {
                    'dist/jquery.tagedit.min.css': ['css/jquery.tagedit.css']
                }
            }
        }
    });


	grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-cssmin');

    grunt.registerTask(
        'default', ['uglify', 'cssmin']
    );

};