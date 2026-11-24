; General first, specific last (later patterns win in Zed)
(identifier) @variable
(property) @property

(comment) @comment
(doc_comment) @comment.doc
(preproc) @preproc

[(string) (char) (string_start) (string_content) (string_end)] @string
(escape_sequence) @string.escape
(date) @string.special
(number) @number
(boolean) @boolean
(nothing) @constant.builtin
(self) @variable.special

(keyword) @keyword
(keyword_operator) @keyword
(type_keyword) @type.builtin
(conversion) @function.builtin

(operator) @operator
(colon) @punctuation.delimiter
(comma) @punctuation.delimiter
(paren_group ["(" ")"] @punctuation.bracket)
(brace_group ["{" "}"] @punctuation.bracket)
(interpolation ["{" "}"] @punctuation.special)

; ALL_CAPS => constant
((identifier) @constant (#match? @constant "^[A-Z][A-Z0-9_]+$"))

; Calls: Foo(...)  /  obj.Foo(...)
((identifier) @function . (paren_group))
((member_access (property) @function) . (paren_group))

; Declarations: Sub/Function Name
((keyword) @_k . (identifier) @function
  (#match? @_k "(?i)^(sub|function|operator|event)$"))

; Property Name
((keyword) @_k . (identifier) @property
  (#match? @_k "(?i)^property$"))

; Type names after As / Of / New / Inherits / Implements / Class ...
((keyword) @_k . (identifier) @type
  (#match? @_k "(?i)^(as|of|new|inherits|implements|class|structure|interface|enum|module|namespace|imports)$"))

; Qualified type/namespace tail:  As System.IO.Stream
((keyword) @_k . (identifier) . (member_access (property) @type)
  (#match? @_k "(?i)^(as|of|new|inherits|implements|imports|namespace)$"))
