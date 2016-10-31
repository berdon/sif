var utils = require('./utils.js'),
    Grammar = require('./grammar.js'),
    Tokenizer = require('./tokenizer.js'),
    sprintf = require('sprintf-js').sprintf,
    vsprintf = require('sprintf-js').vsprintf,
    fs = require('fs');

function Lexeme(token, value, line, column) {
    this._token = token;
    this._value = value;
    this._line = line;
    this._column = column;
}

Lexeme.prototype = {
    token: utils.property.call(this, 'token'),
    name: function() { return this.token().name(); },
    value: utils.property.call(this, 'value'),
    line: utils.property.call(this, 'line'),
    column: utils.property.call(this, 'column'),
    toString: function() {
        return sprintf('%s(%s)', this.token().name(), this.value());
    }
}

function Lexer(startVariable, grammar, tokenizer) {
    this._startVariable = startVariable;
    this._grammar = grammar;
    this._tokenizer = tokenizer;
}

Lexer.prototype = {
    startVariable: utils.getter.call(this, 'startVariable'),
    grammar: utils.getter.call(this, 'grammar'),
    tokenizer: utils.getter.call(this, 'tokenizer'),
    lexeme: utils.getter.call(this, 'lexeme'),
    nextLexeme: utils.getter.call(this, 'nextLexeme'),
    tokenerator: utils.getter.call(this, 'tokenerator'),
    parse: function(filename) {
        // Validate the file
        if (!fs.existsSync(filename)) {
            throw ('Invalid source file - ' + filename);
        }

        // Read the file
        var file = fs.readFileSync(filename, "utf8");

        // Create the tokenerator
        this._tokenerator = this.tokenizer().parse(file);

        // Grab the next lexeme
        getNextLexeme.call(this);
        var lexeme = this.lexeme();
        var nextLexeme = this.nextLexeme();

        // Check to make sure we don't have an illegal token off the bat
        if (lexeme.token() === Tokenizer.Token.UNKNOWN) {
            throw (sprintf('Error: %s:%d:%d - Unknown token found; \"%s\"', filename, lexeme.line(), lexeme.column()));
        }

        // Call the internal parser
        innerParse.call(this, filename, this.startVariable(), null, {});

        // Make sure we ended on the EOF token
        if (lexeme.token() === Tokenizer.Token.EOF) {
            throwError.call(this, filename, lexeme, 'Expected end of file but found $s', lexeme);
        }
    }
}

/* Lexer */
function throwError(filename, lexeme, error) {
    var args = Array.prototype.slice.call(arguments);
    throw (sprintf('Error: %s:%d:%d - %s', filename, lexeme.line(), lexeme.column(), vsprintf(error, args.slice(3))));
}

/* Lexer */
function getNextLexeme() {
    var tokenerator = this.tokenerator();

    if (tokenerator.next()) {
        this._lexeme = new Lexeme(tokenerator.token(), tokenerator.value(), tokenerator.line(), tokenerator.column());
        this._nextLexeme = new Lexeme(tokenerator.nextToken(), tokenerator.nextValue(), tokenerator.nextLine(), tokenerator.nextColumn());

        return true;
    }

    return false;
}

/* Lexer */
function innerParse(filename, variable, rules, context) {
    // Make sure we're on a grammar token
    if (!(variable in this.grammar().variables())) {
        return false;
    }

    // Grab the corresponding phrases for the token
    var phrases = this.grammar().rule(variable);

    // Cycle through each phrase
    for (var i = 0; i < phrases.length; i++) {
        var phrase = phrases[i];

        // Get the first possible tokens from the first word and see if we match
        var firstTokens, followTokens, nextFollowToken;
        firstTokens = this.grammar().getFirstTokens(phrase.production(0));
        followTokens = this.grammar().getFollowTokens(variable, phrase);

        // Check to see if we match or if the first tokens contain lambda
        if ((this.lexeme().name() in firstTokens || Tokenizer.Token.LAMBDA.name() in firstTokens) &&
            ((this.nextLexeme().name() in followTokens || i == phrases.length - 1) || Object.keys(followTokens).length == 0)) {
            // Either our current token or something is a match, so lets begin
            for (var j = 0; j < phrase.productions().length; j++) {
                var word = phrase.production(j);

                // See if the word is a grammar variable
                if (word in this.grammar().variables()) {
                    // Following the successful parsing of a grammar token, call the callback
                    if (phrase.callback()) {
                        phrase.callback()(phrase, word, this.lexeme().token(), this.lexeme().value(), context, false);
                    }

                    // Create a child context
                    var childContext = {
                        token: this.lexeme().token(),
                        value: this.lexeme().value(),
                        parent: context
                    };

                    // If so, we need to go inside to check to see if it matches
                    var lastLexeme = this.lexeme();
                    if (innerParse.call(this, filename, word, phrases, childContext) == false) {
                        // If we're here, it didn't match, no worries
                        return false;
                    }

                    // Update the parent tag
                    delete childContext.parent;
                    context.child = childContext;

                    // Following the successful parsing of a grammar token, we issue a callback
                    if (phrase.callback()) {
                        phrase.callback()(phrase, word, childContext.token, context.value, context, true);
                    }
                } else {
                    // Not a grammar token, we're actually a token
                    // See if we failed - ergo, the token doesn't match what we expected
                    if (this.lexeme().name() != word && word != Tokenizer.Token.LAMBDA.name()) {
                        // Throw the error
                        throwError.call(this, filename, this.lexeme(), 'Expected %s found %s(%s) %s(%s)', word, this.lexeme().name(), this.lexeme().value(), this.nextLexeme().name(), this.nextLexeme().value());
                    }

                    // Call the phrase action handler with null for a word
                    if (phrase.callback()) {
                        phrase.callback()(phrase, word, this.lexeme().token(), this.lexeme().value(), context, true);
                    }

                    // If we're here, the token did match, now see if it was lambda
                    if (word !== Tokenizer.Token.LAMBDA.name()) {
                        // Nope, grab the next token
                        getNextLexeme.call(this);

                        // Make sure we don't get an illegal token
                        if (this.lexeme().token() === Tokenizer.Token.UNKNOWN) {
                            throwError.call(this, filename, this.lexeme(), 'Unknown token found; %s', this.lexeme().value());
                        }
                    }
                }
            }

            // We've successfully parsed this token, so return true
            return true;
        }
    }

    throwError.call(this, filename, this.lexeme(), 'Unmatched grammar token: %s(%s)', this.lexeme().token(), this.lexeme().value());
}

module.exports = {
    Lexer: Lexer
}