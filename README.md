# Plugin gulp-i18n-ui5 [![npm version](https://badge.fury.io/js/gulp-i18n-ui5)](http://badge.fury.io/js/gulp-i18n-ui5)

The plugin is used for simplify work with translations in OpenUI5 or SAPUI5
framework.  The plugin searches views and source code of project in
OpenUI5 or SAPUI5 framework for translation tokens and automatically update
translation file used by the framework.

The plugin searches patterns:

  * \_\_("MSGID")
  * getText("MSGID")
  * "{i18n&gt;MSGID}"

in default configuration.  Then activate/deactivate/add messages in/to
`i18n.properties` file which is used for the translations.

## Install

```
	npm install gulp-18n-ui5
```

## Usage

Just import plugin to gulp file and use it.

```
	const i18n = require("gulp-i18n-ui5");

	var translationFiles = ["webapp/**/*.js", "webapp/manifest.json", "webapp/**/*.xml"];

	gulp.task("i18n", function() {
		return gulp.src(translationFiles)
			.pipe(i18n("webapp/lang/i18n.properties"))
			.pipe(gulp.dest("./"));
	});
```

## Advanced configuration

 * noDeactivateTokens - Tokens which is not deactivated when does not exits in source code workaround for dynamically used translations
 * patterns - array of patterns used to search trnanslaton messagees
 * patterns[].pattern - definition of pattern
 * patterns[].fileExtension - for which file extension is pattern used
 * output - definiton of output file
 * output.fileName - name of file with translation messages
 * output.pattern - pattern which define translation line

Example with advanced configuration

```
	const i18n = require("gulp-i18n-ui5");

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

	var translationFiles = ["webapp/**/*.js", "webapp/manifest.json", "webapp/**/*.xml"];

	gulp.task("i18n", function() {
		return gulp.src(translationFiles)
			.pipe(i18n("webapp/lang/i18n.properties"))
			.pipe(gulp.dest("./"));
	});

```


## Ignore translation tokens

If you use external translations and You need just ignore some tokens
in the translation file Append `#` character to the end of the line.

```
#XTIT
INITIAL=Initial

#XTIT
#EMAIL=Email #Ignore
```
