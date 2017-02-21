'use strict';

/**
 * Gulp task which add/remove i18n tokens in
 * i18n.properties file automatically
 *
 * var localbackend = require('localbackend');
 * var i18n = localbackend.i18n;
 * var translationFiles = ['webapp/model/*.js', 'webapp/controller/*.js', 'webapp/manifest.json', 'webapp/view/*.xml'];
 * gulp.task('i18n', function() {
 *return gulp.src(translationFiles)
 *  .pipe(i18n("webapp/i18n/i18n.properties"))
 *  .pipe(gulp.dest('./'));
 *});
 */

var _ = require('lodash');
var fs = require('fs');
var gutil = require('gulp-util');
var File = gutil.File;
var through = require('through2');
var Buffer = require('buffer').Buffer;
var PluginError = gutil.PluginError;
var log = gutil.log;

/**
 * Merge default configuration and  configuration parameters passed
 * as parameter to task
 *
 * @param {Object} options contains parameters from gulp configuration
 *
 * @return {Object} populated parameters
 */
function setup(options) {
	var params;
	var defaults = {
		patterns: [{
			fileExtensions: ["xml", "html"],
			pattern: "\\{i18n>([^}]+)\\}"
		}, {
			fileExtensions: ["json"],
			pattern: "\\{\\{([^}]+)\\}\\}"
		}, {
			fileExtensions: ["js"],
			pattern: "getText\\([\"']([^\"']+)[\"']"
		}],
		output: {
			fileName: "webapp/i18n/i18n.properties",
			pattern: /^(#*)([^= ]+) *= *(.*)/
		},
		noDeactivateTokens: []
	};

	if (_.isString(options)) {
		params = _.clone(defaults);
		params.output.fileName = options;
	} else {
		params = _.assign(defaults, options);
		params.output = _.assign(defaults.output, options.output);
	}

	return params;
}

/**
 * Implementation of the gulp task which go thru the code and try
 * to find and merge i18n properties from source code and in output
 * file
 *
 * @param {Object} options contains parameters from gulp configuration
 *
 * @return {Trough} task definition
 */
function i18n(options) {
	var config = setup(options);
	var i18nTokens = [];
	var TOKEN = {
		UNDEF: 0,
		INACTIVE: 1,
		ACTIVE: 2
	};

	/**
	 * Read content from intput files
	 *
	 * @param {gulp.File} file - Object with content and all other informations
	 *                           about input file.
	 * @param {Object} options - parameters from gulp
	 * @param {Function } cb - to next gulp task
	 *
	 * @return {void}
	 */
	function bufferContents(file, options, cb) {
		var pattern;

		if (file.isNull()) { // ignore empty files
			cb();
		} else if (file.isStream()) { // we don't do streams (yet)
			this.emit('error', new PluginError('gulp-concat', 'Streaming not supported'));
			cb();
			return;
		} else {
			pattern = findPattern(file.path);
			if (pattern) {
				i18nTokens = _.chain(file.contents.toString().match(new RegExp(pattern, "gm")))
					.map(function(matchedString) {
						return (new RegExp(pattern)).exec(matchedString.toString())[1];
					})
					.concat(i18nTokens)
					.value();
			}
			cb();
		}
	}

	/**
	 * Try to find pattern for partifular filename
	 *
	 * @param {String} filename - filename for pattern finding
	 *
	 * @return {RegExp} found pattern or undefined if pattern not found
	 */
	function findPattern(filename) {
		var patternDefinition = _.find(config.patterns, function(obj) {
			return _.find(obj.fileExtensions, function(extension) {
				return filename.substring(filename.length - extension.length) === extension;
			}) !== undefined;
		});
		if (patternDefinition) {
			patternDefinition = patternDefinition.pattern;
		}
		return patternDefinition;
	}

	/**
	 * Finalize output from gulp task
	 *
	 * @param {Function } cb - to next gulp task
	 *
	 * @return {void}
	 */
	function endStream(cb) {
		var outputFile;

		if (!i18nTokens) { // no files passed in, no file goes out
			cb();
		} else {

			outputFile = new File({
				path: config.output.fileName,
				contents: new Buffer(mergeTokens(i18nTokens, readTokens()).join("\n") + "\n")
			});
			this.push(outputFile);
			cb();
		}
	}

	/**
	 * Read tokens from destination file
	 *
	 * @return {Array} - array of object with token definition
	 */
	function readTokens() {
		var buf = fs.readFileSync(config.output.fileName);
		var tokens = _.chain(buf.toString().split("\n"))
			.map(function(row) {
				var retval = {
					type: TOKEN.UNDEF,
					line: row
				};
				var match = row.match(config.output.pattern);
				if (match !== null) {
					if (match[1] === "#") {
						retval.type = TOKEN.INACTIVE;
					} else {
						retval.type = TOKEN.ACTIVE;
					}
					retval.name = match[2];
					retval.value = match[3];
				}
				return retval;
			})
			.dropRightWhile(function(token) {
				return token.line === '';
			}).value();

		return tokens;
	}

	/**
	 * Merge tokens from property file and from current source codes
	 *
	 * @param {Arrray} sourceCodeTokens - array of words with current
	 *              messages for translations
	 * @param {Arrray} i18nPropertiesFileTokens - array of objects with
	 *              tokens from current localize files
	 *
	 * @return {Array} - array of object with updated token definition
	 */
	function mergeTokens(sourceCodeTokens, i18nPropertiesFileTokens) {
		//Find token which needs to be add
		var tokensToAdd = _.chain(sourceCodeTokens)
			.filter(function(token) {
				return _.find(i18nPropertiesFileTokens, function(v) {
					return (v.type === TOKEN.ACTIVE || v.type === TOKEN.INACTIVE) && v.name === token;
				}) === undefined;
			}).map(function(token) {
				log('APPEND token ' + gutil.colors.cyan(token));
				return {
					type: TOKEN.ACTIVE,
					line: token + "=" + token2Message(token),
					name: token,
					value: token
				};
			}).value();

		//Comment tokens which needs to be deactivated
		_.chain(i18nPropertiesFileTokens).filter(function(token) {
			return token.type === TOKEN.ACTIVE &&
				_.find(config.noDeactivateTokens, function(v) {
					return v === token.name;
				}) === undefined &&
				_.find(sourceCodeTokens, function(v) {
					return v === token.name;
				}) === undefined;
		}).map(function(token) {
			log('DEACTIVATE token ' + gutil.colors.cyan(token.name));
			token.line = "#" + token.line;
		}).value();

		_.chain(i18nPropertiesFileTokens).filter(function(token) {
			return token.type === TOKEN.INACTIVE && _.find(sourceCodeTokens, function(v) {
				return v === token.name;
			});
		}).map(function(token) {
			log('ACTIVATE token ' + gutil.colors.cyan(token.name));
			token.line = token.line.replace("#", "");
		}).value();


		return _.chain(i18nPropertiesFileTokens)
			.concat(tokensToAdd)
			.map(function(obj) {
				return obj.line;
			});
	}

	/**
	 * Convert token to example message. Convert camelcased string to
	 * message with spaces between words which has divided by upper case
	 * letters
	 *
	 * Example: MyUsefulMessage => My useful message
	 *
	 * @param {String} token - from source code
	 *
	 * @return {String} converted message
	 */
	function token2Message(token) {
		return token.replace(/([a-z])([A-Z])/g, function(match, p1, p2) {
			return p1 + " " + p2.toLowerCase();
		});
	}

	return through.obj(bufferContents, endStream);
}

// Exporting the plugin functions
module.exports = i18n;
