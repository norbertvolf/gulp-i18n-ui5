#Plugin Gulp-i18n

This is gulp-plugin which searches views and sourcode for translations.

The plugin In default configuration searches patterns:

  * \_\_("MSGID")
  * getText("MSGID")
  * "{i18n&gt;MSGID}"

Then activate/deactivate and add messages to i18n/i18n.properties
file which is used for the translations in Fiory projects.

#Install

	npm install --save-dev git+ssh://git@github.wdf.sap.corp:I332698/gulp-18n.git

#Usage

Just import plugin to gulp file and use it.

	var i18n = require("gulp-i18n");

	var translationFiles = ["webapp/**/*.js", "webapp/manifest.json", "webapp/view/**/*.xml"];

	return gulp.src(translationFiles)
		.pipe(i18n("webapp/i18n/i18n.properties"))
		.pipe(gulp.dest("./"));

#Advanced configuration

 * noDeactivateTokens - Tokens which is not deactivated when does not exits in source code workaround for dynamically used translations
 * patterns - array of patterns used to search trnanslaton messagees
 * patterns[].pattern - definition of pattern
 * patterns[].fileExtension - for which file extension is pattern used
 * output - definiton of output file
 * output.fileName - name of file with translation messages
 * output.pattern - pattern which define translation line

Example with advanced configuration 

	var i18n = require("gulp-i18n");
	var configuration = {
		patterns: [{
			fileExtensions: ["xml", "html"],
			pattern: "\\{i18n>([^}]+)\\}"
		}, {
			fileExtensions: ["json"],
			pattern: "\\{\\{([^}]+)\\}\\}"
		}, {
			fileExtensions: ["js"],
			pattern: "(?:getText|__)\\([\"']([^\"']+)[\"']"
		}],
		output: {
			fileName: "webapp/i18n/i18n.properties",
			pattern: /^(#*)([^= ]+) *= *(.*)/
		},
		noDeactivateTokens: []
	};

	var translationFiles = ["webapp/**/*.js", "webapp/manifest.json", "webapp/view/**/*.xml"];

	return gulp.src(translationFiles)
		.pipe(i18n("webapp/i18n/i18n.properties"))
		.pipe(gulp.dest("./"));

