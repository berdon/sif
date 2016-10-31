var utils = require('./utils.js'),
    tokenizer = require('./tokenizer.js');

function Grammar(rules) {
    if (!rules) {
        rules = {};
    }
    this._variables = {};
    this._rules = rules;
}

Grammar.fromFile = function(filename) {
    // Read the file
    var file = fs.readFileSync(filename);
    var lines = file.split('\n');

    // Iterate through each rule definition
    // TOKEN -> RULE | RULE | ...
}

Grammar.prototype = {
    variables: utils.property.call(this, 'variables'),
    rules: utils.property.call(this, 'rules'),

    add: function(phrase, production) {
        if (arguments.length == 1) {
            if (!(phrase.variable() in this.rules())) {
                this.variables()[phrase.variable()] = phrase.variable();
                this.rules()[phrase.variable()] = [];
            }

            this.rules()[phrase.variable()].push(phrase);
        } else if (arguments.length == 2) {
            if (!(phrase in this.rules())) {
                this.rules()[phrase] = [];
            }

            this.variables()[phrase] = phrase;
            this.rules()[phrase].push(new Phrase(phrase, production));
        } else if (arguments.length > 2) {
            if (!(phrase in this.rules())) {
                this.rules()[phrase] = [];
            }

            this.variables()[phrase] = phrase;
            this.rules()[phrase].push(new Phrase(phrase, production));

            for (var i = 2; i < arguments.length; i++) {
                this.rules()[phrase].push(new Phrase(phrase, arguments[i]));
            }
        }
    },

    rule: function(variable) {
        return this.rules()[variable];
    },

    getFirstTokens: function(token, tokens) {
        if (!tokens) {
            tokens = {}
        }

        if (!(token in this.rules())) {
            tokens[token] = token;
            return tokens;
        }

        var rules = this.rule(token);
        for (var i = 0; i < rules.length; i++) {
            var phrase = rules[i];

            var newTokens = this.getFirstTokens(phrase.production(0), tokens);
            for (var key in newTokens) {
                tokens[key] = key;
            }
        }

        return tokens;
    },

    getFollowTokens: function(token, phrase) {
        var seenPhrases = [];
        var seenFirst = false;

        // Call the inner get tokens method
        result = innerGetFollowTokens.call(this, phrase, null, seenPhrases, seenFirst);

        // Remove lambda from the lsit
        delete result.tokens[tokenizer.Token.LAMBDA.name()];

        return result.tokens;
    },

    toString: function() {
        var result = 'S = ' + this.startVariable() + '\r\n';
        result += 'V = ' + Object.keys(this.variables()).join(', ') + '\r\n';
        for (var key in this.rules()) {
            result += key + ' -> ';

            for (var i = 0; i < this.rules()[key].length; i++) {
                var phrase = this.rules()[key][i];
                result += phrase.productions().join(' ');
                if (i < this.rules()[key].length - 1) {
                    result += ' | ';
                }
            }

            if (i < this.rules().length - 1) {
                result += '\r\n';
            }
        }
        return result;
    }
}

/* Grammar */
function innerGetFollowTokens(phrase, tokens, seenPhrases, seenFirst) {
    if (!tokens) {
        tokens = {};
    }

    for (var i = 0; i < phrase.productions().length; i++) {
        var word = phrase.production(i);

        // Check to see if the word is a grammar variable
        if (!(word in this.variables())) {
            if (word === tokenizer.Token.LAMBDA.name()) {
                // Add lambda
                tokens[tokenizer.Token.LAMBDA.name()] = tokenizer.Token.LAMBDA.name();
            } else if (seenFirst == false) {
                seenFirst = true;
            } else {
                tokens[word] = word;
                return {
                    result: true,
                    tokens: tokens
                };
            }
        } else {
            var newSeenFirst = seenFirst;
            var finished = true;
            var subPhrases = this.rule(word);

            for (var j = 0; j < subPhrases.length; j++) {
                var subPhrase = subPhrases[j];
                newSeenFirst = seenFirst;

                var result = innerGetFollowTokens.call(this, subPhrase, tokens, seenPhrases, newSeenFirst);

                finished &= result.result;
                tokens = result.tokens;
            }

            if (tokenizer.Token.LAMBDA.name() in tokens) {
                delete tokens[tokenizer.Token.LAMBDA.name()];
                finished = false;
            } else {
                seenFirst = true;
            }

            if (finished) {
                return {
                    result: true,
                    tokens: tokens
                };
            }
        }
    }

    return {
        result: false,
        tokens: tokens
    };
}

function Phrase(variable, productions, callback) {
    this._variable = variable;

    this._productions = [];
    var productionCallbacks = {};

    if (productions) {
        var initialCallback = null;

        for (var i = 0; i < productions.length; i++) {
            var production = productions[i];
            if (typeof(production) === 'string') {
                this._productions.push(production);
            } else if (typeof(production) === 'function') {
                if (this._productions.length == 0) {
                    initialCallback = production;
                } else {
                    productionCallbacks[this._productions[this._productions.length - 1]] = production;
                }
            } else {
                throw ('Invalid phrase production rule; expecting a string got ' + typeof(production));
            }
        }

        if (initialCallback && this._productions.length > 0) {
            initialCallback.pre = true;
            productionCallbacks[this._productions[0]] = initialCallback;
        }
    }

    if (callback) {
        this._callback = callback;
    } else {
        this._callback = function(phrase, word, token, value, context, isFinal) {
            var innerCallback = productionCallbacks[word];
            if (innerCallback && (isFinal || innerCallback.pre)) {
                var context = { phrase: phrase, word: word, token: token, value: value, context: context, isFinal: isFinal };
                innerCallback(value, token, phrase, word, isFinal, context.context);
            }
        }
    }
}

Phrase.prototype = {
    variable: utils.property.call(this, 'variable'),
    productions: utils.property.call(this, 'productions'),
    callback: utils.property.call(this, 'callback'),
    production: function(index) {
        return this.productions()[index];
    },
    toString: function() {
        return this.variable() + ' -> ' + this.production().join(' ');
    }
}

module.exports = {
    Phrase: Phrase,
    Grammar: Grammar
}