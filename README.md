# simple-file-compare

Compares files dropped into a webpage into those stored on the server. Does some partial credit stuff for use in academic applications.

## Notes

- Load `file_comparison.html` from a server, not from disk. It needs to run a fetch.
- Settings are currently in a `script` tag in the HTML. We can load from JSON.
- The `test_reference` is the professor-uploaded file. `test_input` is for samples of learner-uploaded files to run against them. Note that actual filenames are declared in the options, so if you want to test new things you need to change the options.
- The hashing algorithm used is **SHA-256**. If you call your algorithm on the string `test` and you get `9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08` back, you are probably using the right algorithm.

## Status

Pretty good so far. Need polish.

**Potential feature:** Add options for flexible values, like a changed surname or function name.
