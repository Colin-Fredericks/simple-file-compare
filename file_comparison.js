"use strict";
console.log("working");
let options_filename = document.currentScript.getAttribute("data-options");

/** Create the file drop area and set up listeners. No parameters. */
async function init() {
  // Create a file-drop area for processing.
  const fileDropArea = document.getElementById("file-drop-area");
  let all_file_content = {};
  // Can be set in the HTML for testing, or retrieved from the server for production.
  if (!window.file_comparison_options) {
    window.file_comparison_options = await getOptions();
  }
  const options = window.file_comparison_options;
  displayMessage(
    "Required files: " + options.correct_answers.join(", "),
    "prompt-area",
    false,
  );

  // Add event listeners for drag and drop functionality.
  fileDropArea.addEventListener("dragover", (event) => {
    event.preventDefault();
    fileDropArea.classList.add("dragover");
  });

  fileDropArea.addEventListener("dragleave", (event) => {
    event.preventDefault();
    fileDropArea.classList.remove("dragover");
  });

  fileDropArea.addEventListener("drop", async (event) => {
    event.preventDefault();
    fileDropArea.classList.remove("dragover");
    const files = event.dataTransfer.files;
    all_file_content = await readFiles(files, options);
    compareFiles(all_file_content, options);
  });

  // Let people click on the area to open a file dialog
  // in case they can't drag.
  fileDropArea.addEventListener("click", () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.multiple = true; // Allow multiple files to be selected.
    fileInput.addEventListener("change", async (event) => {
      const files = event.target.files;
      all_file_content = await readFiles(files, options);
      compareFiles(all_file_content, options);
    });
    fileInput.click();
  });
}
init();

/**
 * Reads in the learner files and returns most of the info as an object.
 *
 * @param {FileList} files - The list of files uploaded by the learner.
 * @param {Object} options - The options for the file comparison, as defined in the XML.
 *
 * @returns {Promise<Object>} An object containing the file information.
 */
async function readFiles(files, options) {
  let all_file_content = {};
  for (const f of files) {
    const reader = new FileReader();
    await new Promise((resolve, reject) => {
      reader.onload = (event) => {
        const file_content = event.target.result;
        // console.log(f);
        all_file_content[f.name] = {
          content: file_content,
          size: f.size,
          type: f.type,
        };
        resolve();
      };
      reader.onerror = (event) => {
        reject(event.target.error);
      };
      reader.readAsText(f);
    });
  }
  return Promise.resolve(all_file_content);
}

/**
 * Compares file content uploaded by learners to the correct answers.
 * Returns score and comments.
 * @param {*} all_file_content
 * @param {*} options
 */
async function compareFiles(all_file_content, options) {
  if (Object.keys(all_file_content).length !== options.correct_answers.length) {
    console.error("Did not upload all files.");
    displayMessage(
      "You uploaded " +
        Object.keys(all_file_content).length +
        " out of " +
        options.correct_answers.length +
        " required files. Please upload the required files.",
      "output-area",
      false,
    );
    return;
  }

  let max_credit = Object.keys(all_file_content).length;
  let current_credit = 0;
  let missing_required_word = options.must_have.map((x) => true); // Start with all required words missing
  let message = ""; // Will be reported to learner

  for (const fileName in all_file_content) {
    const f = all_file_content[fileName];
    f.name = fileName;
    let this_file_credit = 1;
    let apply_partial_credit = {
      blank_lines: false,
      case: false,
      spaces: false,
    };

    if (
      !f.type.includes("text") &&
      !f.type.includes("json") &&
      !f.type.includes("javascript") &&
      !f.type.includes("python")
    ) {
      // This is not a text file.
      let outputArea = document.querySelector("#output-area");
      outputArea.innerHTML += "<p>" + f.name + " is not a text file.</p>";
      console.log(f.name);
      console.log(f.type);
    } else {
      // Yay it's a text file!
      displayMessage("Filename: " + f.name, "output-area", true);

      // Go get the file to compare to.
      let correct_file_content = await retrieveFile(
        f.name,
        options.test_file_source,
      );

      // Using hashes if you want to avoid revealing the correct answer
      if (options.files_or_hashes === "hashes") {
        // Hash the correct file content and the submitted file content.
        let correct_file_hash = options.correct_answers[fileName];
        let submitted_file_hash = await sha256(f.content);
        if (correct_file_hash === submitted_file_hash) {
          console.log("Hashes match for " + f.name);
          continue;
        } else {
          this_file_credit = 0;
          continue;
        }
      }

      // Keys for the `credit_options` object. All are Numbers.
      //   blank_lines
      //   case
      //   spaces
      //   low_cutoff
      //   high_cutoff
      //   participation_points

      // console.log('Correct file content:');
      // console.log(correct_file_content);
      let submitted_file_content = f.content;
      let correct_by_line = correct_file_content.split("\n");
      let submitted_by_line = submitted_file_content.split("\n");

      // Compare the two files line by line.
      let offset = 0;
      let match_by_line = [];
      for (let i = 0; i < correct_by_line.length; i++) {
        // If one of the prohibited words is present, stop now. Zero credit.
        for (const prohibited_word of options.cannot_have) {
          if (submitted_by_line[i + offset].includes(prohibited_word)) {
            console.log("Prohibited word found: " + prohibited_word);
            message +=
              "Prohibited word found: " +
              prohibited_word +
              ". No credit for this file.\n";
            this_file_credit = 0;
            break;
          }
        }
        // Make sure we have all the required words eventually.
        for (let j = 0; j < options.must_have.length; j++) {
          const required_word = options.must_have[j];
          if (submitted_by_line[i + offset].includes(required_word)) {
            missing_required_word[j] = false;
          }
        }

        // console.log('Comparing line ' + (i + 1));
        if (i + offset >= submitted_by_line.length) {
          console.log("Ran out of lines in submitted file.");
          message +=
            "Ran out of lines in " + f.name + ". No credit for this file.\n";
          break;
        }
        if (correct_by_line[i] === submitted_by_line[i + offset]) {
          // Perfect match, everything's great.
          match_by_line.push(true);
          continue;
        }

        if (correct_by_line[i] === "" && submitted_by_line[i + offset] !== "") {
          // The correct file has a blank line, but the submitted file does not.
          // Hold back our count on the submitted file by one line.
          console.log(
            "Holding back one line at " +
              (i + 1) +
              " in the submitted file because the correct file has a blank line.",
          );
          apply_partial_credit.blank_lines = true;
          offset--;
          continue;
        } else if (
          correct_by_line[i] !== "" &&
          submitted_by_line[i + offset] === ""
        ) {
          // The submitted file has a blank line, but the correct file does not.
          // Move forward the line we're examining in the submitted file by one line.
          console.log(
            "Moving forward one line at " +
              (i + 1) +
              " in the submitted file because the submitted file has a blank line.",
          );
          apply_partial_credit.blank_lines = true;
          offset++;
          continue;
        }

        // Imperfect match, check for partial credit.
        let cl = correct_by_line[i].trim();
        let sl = submitted_by_line[i + offset].trim();
        if (cl !== sl) {
          // Case checking
          if (cl.toLowerCase() === sl.toLowerCase()) {
            console.log("Line " + (i + 1) + " is the same except for case.");
            apply_partial_credit.case = true;
          } else {
            console.log(
              "Line " + (i + 1) + " is entirely different. Done comparing.",
            );
            message +=
              "Line " +
              (i + 1) +
              " is entirely different in " +
              f.name +
              ". No credit for this file.\n";
            this_file_credit = 0;
            break;
          }
        } else {
          // Whitespace checking
          console.log(
            "Line " +
              (i + 1) +
              " matches except for whitespace at start or end.",
          );
          apply_partial_credit.spaces = true;
        }
      }
      console.log("Match by line for " + f.name + ":");
      console.log(match_by_line);
    }
    for (const key in apply_partial_credit) {
      if (apply_partial_credit[key]) {
        console.log("Partial credit applied for " + key);
        this_file_credit *= options.credit_options[key];
      }
    }
    if (missing_required_word.includes(true)) {
      console.log("Missing required word(s) in " + f.name);
      this_file_credit = 0;
    }
    this_file_credit = Math.round(this_file_credit * 100) / 100; // Round to two decimal places
    current_credit += this_file_credit;
    console.log(
      "Credit for " + f.name + ": " + decimalToPercentage(this_file_credit),
    );

    if (this_file_credit > 0) {
      if (options.credit_options.spaces && apply_partial_credit.spaces) {
        message +=
          "Partial credit for whitespace: " +
          decimalToPercentage(options.credit_options.spaces) +
          "\n";
      }
      if (options.credit_options.case && apply_partial_credit.case) {
        message +=
          "Partial credit for case: " +
          decimalToPercentage(options.credit_options.case) +
          "\n";
      }
      if (
        options.credit_options.blank_lines &&
        apply_partial_credit.blank_lines
      ) {
        message +=
          "Partial credit for blank lines: " +
          decimalToPercentage(options.credit_options.blank_lines) +
          "\n";
      }
    }
  }
  let credit = current_credit / max_credit;
  console.log(
    "Final credit: " + decimalToPercentage(current_credit / max_credit),
  );
  message += "Final credit: " + decimalToPercentage(credit) + "\n";
  displayMessage(message, "output-area", true);
  // Send it back or save the state or whatever.
}

/**
 * Pulls options from the HTML on the page.
 * On edX these are declared in Python and inserted into the HTML.
 */
async function getOptions() {
  let options = JSON.parse(await retrieveFile(options_filename, ""));
  console.log(options);
  return options;
}

/**
 * Displays a message in the specified area.
 * @param {string} message - The message to display.
 * @param {string} area_id - The ID where we're displaying - normally info or output
 * @param {boolean} append - Whether to append the message or replace existing content.
 */
function displayMessage(message, area_id, append = false) {
  let info_area = document.getElementById(area_id);
  if (!append) {
    info_area.innerHTML = ""; // Clear previous messages
  }
  let p = document.createElement("p");
  message = message.replace(/\n/g, "<br>"); // Replace newlines with <br> for HTML display
  p.innerHTML = message;
  info_area.appendChild(p);
}

/**
 * Turns a decimal number or string to a percentage string.
 * @param {number|string} decimal - The decimal number to convert.
 * @param {number} n - The number of decimal places to include in the percentage.
 * @returns {string} The percentage string.
 */
function decimalToPercentage(decimal, n = 0) {
  decimal = parseFloat(decimal);
  return (decimal * 100).toFixed(n) + "%";
}

/** Loads the file from the listed folder. Folder can be a fully qualified URL. */
async function retrieveFile(file_name, folder_name) {
  let base = window.location.href.split("/").slice(0, -1).join("/");
  console.log(base + "/" + folder_name + file_name);
  const file_content = await fetch(
    base + "/" + folder_name + "/" + file_name,
  ).then((response) => response.text());
  return file_content;
}

/**
 * Hashes text to SHA256 for the purpose of comparing answers without revealing the answer itself.
 * Taken from https://stackoverflow.com/a/70243259/1330737
 *
 * @param {string} source
 * @returns {Promise<string>}
 */
async function sha256(source) {
  const sourceBytes = new TextEncoder().encode(source);
  const digest = await crypto.subtle.digest("SHA-256", sourceBytes);
  const resultBytes = [...new Uint8Array(digest)];
  return resultBytes.map((x) => x.toString(16).padStart(2, "0")).join("");
}
