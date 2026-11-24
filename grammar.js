/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

// A deliberately "lexical" grammar for Visual Basic (.NET).
// It tokenizes VB precisely (case-insensitive keywords, multi-line strings,
// interpolated strings, comments, dates, numbers, preprocessor lines) and only
// adds the structure that editors need (lines, paren/brace groups).
// Everything else is done with predicates in queries/highlights.scm.

const ci = (word) =>
  word
    .split('')
    .map((c) => (/[a-z]/i.test(c) ? `[${c.toLowerCase()}${c.toUpperCase()}]` : c))
    .join('');

const words = (list) => new RegExp(list.map(ci).join('|'));

const KEYWORDS = [
  'AddHandler', 'Alias', 'As', 'Async', 'Await', 'ByRef', 'ByVal', 'Call', 'Case',
  'Catch', 'Class', 'Const', 'Continue', 'Custom', 'Declare', 'Default', 'Delegate',
  'Dim', 'Do', 'Each', 'Else', 'ElseIf', 'End', 'Enum', 'Erase', 'Error', 'Event',
  'Exit', 'Finally', 'For', 'Friend', 'Function', 'Get', 'GetXMLNamespace', 'Global',
  'GoTo', 'Handles', 'If', 'Implements', 'Imports', 'In', 'Inherits', 'Interface',
  'Iterator', 'Let', 'Lib', 'Loop', 'Module', 'MustInherit', 'MustOverride',
  'Namespace', 'Narrowing', 'New', 'Next', 'NotInheritable', 'NotOverridable', 'Of',
  'On', 'Operator', 'Option', 'Optional', 'Out', 'Overloads', 'Overridable',
  'Overrides', 'ParamArray', 'Partial', 'Preserve', 'Private', 'Property',
  'Protected', 'Public', 'RaiseEvent', 'ReadOnly', 'ReDim', 'RemoveHandler', 'Resume',
  'Return', 'Select', 'Set', 'Shadows', 'Shared', 'Static', 'Step', 'Stop',
  'Structure', 'Sub', 'SyncLock', 'Then', 'Throw', 'To', 'Try', 'Until', 'Using',
  'When', 'While', 'Widening', 'With', 'WithEvents', 'WriteOnly', 'Yield',
  // LINQ (only the unambiguous ones)
  'From', 'Where', 'Into', 'Join', 'Aggregate', 'Distinct', 'Ascending', 'Descending',
];

const OPERATOR_WORDS = [
  'And', 'AndAlso', 'Or', 'OrElse', 'Xor', 'Not', 'Mod', 'Is', 'IsNot', 'Like',
  'TypeOf', 'AddressOf', 'GetType', 'CType', 'DirectCast', 'TryCast',
];

const TYPES = [
  'Boolean', 'Byte', 'SByte', 'Char', 'Date', 'Decimal', 'Double', 'Integer', 'Long',
  'Object', 'Short', 'Single', 'String', 'UInteger', 'ULong', 'UShort', 'Variant',
];

const CONVERSIONS = [
  'CBool', 'CByte', 'CChar', 'CDate', 'CDbl', 'CDec', 'CInt', 'CLng', 'CObj',
  'CSByte', 'CShort', 'CSng', 'CStr', 'CUInt', 'CULng', 'CUShort',
];

const PREPROC = [
  'If', 'ElseIf', 'Else', 'End', 'Const', 'Region', 'ExternalSource', 'ExternalChecksum',
  'Disable', 'Enable',
];

const INT_SUFFIX = '(?:[Uu][Ss]|[Uu][Ii]|[Uu][Ll]|[SsIiLl])?';
const FLOAT_SUFFIX = '[FfRrDd]?';

module.exports = grammar({
  name: 'vb',

  extras: () => [/[ \t\f\r\u00A0]+/, /_[ \t]*\r?\n/],

  rules: {
    source_file: ($) =>
      seq(repeat($.line), optional(alias($._items, $.line))),

    _items: ($) => repeat1($._item),

    line: ($) => choice($._eol, seq($._items, $._eol)),

    _eol: () => /\n/,

    _item: ($) =>
      choice(
        $.doc_comment,
        $.comment,
        $.preproc,
        $.string,
        $.interpolated_string,
        $.char,
        $.date,
        $.number,
        $.boolean,
        $.nothing,
        $.self,
        $.type_keyword,
        $.conversion,
        $.keyword_operator,
        $.keyword,
        $.identifier,
        $.member_access,
        $.operator,
        $.paren_group,
        $.brace_group,
        alias(',', $.comma),
        alias(':', $.colon),
        $.other,
      ),

    // --- comments ---------------------------------------------------------
    doc_comment: () => token(/'''[^\r\n]*/),
    comment: () =>
      token(choice(/'[^\r\n]*/, new RegExp(`${ci('REM')}(?:[ \\t][^\\r\\n]*)?`))),

    // --- preprocessor / date ---------------------------------------------
    preproc: () =>
      token(prec(2, new RegExp(`#[ \\t]*(?:${PREPROC.map(ci).join('|')})(?:[ \\t][^\\r\\n]*)?`))),
    date: () => token(prec(1, /#[ \t]*[0-9][0-9\/\-:. \tAaPpMm]*#/)),

    // --- strings (these can span multiple lines) --------------------------
    string: () => token(seq('"', repeat(choice(/[^"]/, '""')), '"')),

    char: () => token(prec(2, seq('"', choice(/[^"]/, '""'), '"', /[cC]/))),

    interpolated_string: ($) =>
      seq(
        alias(token('$"'), $.string_start),
        repeat(choice($.string_content, $.escape_sequence, $.interpolation)),
        alias('"', $.string_end),
      ),

    string_content: () => token(prec(-1, /[^"{}]+/)),
    escape_sequence: () => token(prec(1, choice('""', '{{', '}}'))),

    interpolation: ($) => seq('{', repeat(choice($._item, $._eol)), '}'),

    // --- numbers ------------------------------------------------------------
    number: () =>
      token(
        choice(
          new RegExp(`&[Hh][0-9A-Fa-f_]+${INT_SUFFIX}`),
          new RegExp(`&[Oo][0-7_]+${INT_SUFFIX}`),
          new RegExp(`&[Bb][01_]+${INT_SUFFIX}`),
          new RegExp(`[0-9][0-9_]*\\.[0-9][0-9_]*(?:[Ee][+-]?[0-9]+)?${FLOAT_SUFFIX}`),
          new RegExp(`\\.[0-9][0-9_]*(?:[Ee][+-]?[0-9]+)?${FLOAT_SUFFIX}`),
          new RegExp(`[0-9][0-9_]*[Ee][+-]?[0-9]+${FLOAT_SUFFIX}`),
          new RegExp(`[0-9][0-9_]*${INT_SUFFIX}`),
          new RegExp(`[0-9][0-9_]*[FfRrDd]`),
        ),
      ),

    // --- words --------------------------------------------------------------
    boolean: () => token(words(['True', 'False'])),
    nothing: () => token(words(['Nothing'])),
    self: () => token(words(['Me', 'MyBase', 'MyClass'])),
    type_keyword: () => token(words(TYPES)),
    conversion: () => token(words(CONVERSIONS)),
    keyword_operator: () => token(words(OPERATOR_WORDS)),
    keyword: () => token(words(KEYWORDS)),

    identifier: () => token(choice(/[\p{L}_][\p{L}\p{N}_]*/, /\[[^\]\r\n]+\]/)),

    // `.Foo` — after a dot, anything (even a keyword) is a member name.
    member_access: ($) => seq('.', $.property),
    property: () => token(prec(5, choice(/[\p{L}_][\p{L}\p{N}_]*/, /\[[^\]\r\n]+\]/))),

    // --- operators / grouping ------------------------------------------------
    operator: () =>
      token(choice('<<=', '>>=', '&=', '+=', '-=', '*=', '/=', '\\=', '^=', '<>', '<=',
        '>=', ':=', '<<', '>>', '=', '<', '>', '+', '-', '*', '/', '\\', '^', '&', '!', '?')),

    paren_group: ($) => seq('(', repeat(choice($._item, $._eol)), ')'),
    brace_group: ($) => seq('{', repeat(choice($._item, $._eol)), '}'),

    other: () => token(prec(-10, /[^\s]/)),
  },
});
