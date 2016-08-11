/**
 * Tag abstractions library
 *
 * Used by article parser (saveHTMLtoJSON)
 * Special tags created by markedown renderer for easier parsing
 */

module.exports = {
    "tags": {
        "section": "meta-section",
        "category": "meta-category",
        "article": "meta-article",
        "file": "meta-file",
        "priority": "meta-priority",
        "example": "code-example",
    },
    "patterns": {
        "section": "section",
        "category": "category",
        "article": "title|article",
        "file": "file|files|location",
        "priority": "priority|order",
        "requires": "requires|require|req",
        "returns": "returns|return|ret",
        "alias": "alias|aliases",
        "param": "parameter|param|arg|argument",
        "links": "source|reference|ref|link"
    }
};
