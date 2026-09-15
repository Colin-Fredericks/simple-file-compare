# simple-file-compare

Compares files dropped into a webpage into those stored on the server. Does some partial credit stuff for use in academic applications.

## Options

Declared in the inline javascript (takes priority) or in a referenced file.

- `test_file_source`: String. The folder name for the reference files (the ones we're testing against). Used only for local development.
- `files_or_hashes`: String. Accepts "files" or "hashes". You can compare files against each other or just hash the input and compare it to a hash. The advantage of file comparison is that you can do partial credit stuff and more detailed responses. The disadvantage is that it's vulnerable to an F12 attack (i.e. learners could theoretically get the content of the file and cheat).
- `filenames`: Array of Strings. Learners must submit files with names that match the ones here.
- `hashes`: Object{Strings: Strings}. These are SHA256 hashes of the full file content.
- `must_have`: Array of Strings. Words that must be present in the code in order to receive full credit.
- `cannot_have`: Array of Strings. Words that must NOT be present in the code or the learner loses credit.
- `credit_options`: Object{Strings: Numbers}. All numbers are between 0 and 1 inclusive. Specific entries as follows:
  - `blank_lines`: Multiplier that's applied if one of the files has a blank line when the other doesn't. Set this to 0 to make this a must-have requirement; set it to 1 to make blank line matches an optional criterion.
  - `case`: Multiplier that's applied if a submitted line matches the reference only when both are lowercased. Same note about for must-have / optional.
  - `spaces`: Multiplier that's applied if a submitted line has extra spaces in it compared to the reference. Same note about for must-have / optional.
  - `low_cutoff`: If the total credit is below this amount, round down to zero.
  - `high_cutoff`: If the total credit is above this amount, round up to full credit.
  - `participation points`: Add this amount of credit to every attempt, max 100%.

## Notes

- Load `file_comparison.html` from a server, not from disk. It needs to run a fetch. If you're in edX or LXP that's no problem.
- The `test_reference` folder is for the professor-uploaded file. `test_input` is for samples of learner-uploaded files to run against them. Note that actual filenames are declared in the options, so if you want to test new things you need to change the options.
- The hashing algorithm used is **SHA-256**. If you call your algorithm on the string `test` and you get `9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08` back, you are probably using the right algorithm. You can obtain the hashes [in python](https://docs.python.org/3/library/hashlib.html#usage) via the `hashlib` library or [in Javascript](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest) via the `crypto` library in-browser.

## Status

Functions on both edX and LXP. Call this the 1.0 version.

Needs to be prettier.

**Potential feature:** Add options for flexible values, like a changed surname or function name.
