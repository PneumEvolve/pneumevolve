import { useState } from "react";
import { showAlert } from "@/Pages/Learning/alert"

// ============================================================
// LEARNING PLAYGROUND
// Write your exercises below. Use the output panel on the right
// to see results without opening DevTools.
//
// How to print output: call log("anything") instead of console.log
// ============================================================

/* 
"strict mode";
When it is located at the top of a script, the whole script works the “modern” way.
*/

/*
let declares a variable and = declares what the variable is. The name must contain only letters, digits, or the symbols $ and _.
The first character must not be a digit.Example:

let message = 'Hello World!';
alert(message);

To declare a constant (unchanging) variable, use const instead of let:

const = 'Hello Poop!';
EXERCISE FOR VARIABLES/CONSTANTS
Declare two variables: admin and name.
Assign the value "John" to name.
Copy the value from name to admin.
Show the value of admin using alert (must output “John”).
*/
/*
let admin;
let name = "John";
admin = name;
function runExercises(log) {
    alert(admin);
}
    Seven primitive data types:
number for numbers of any kind: integer or floating-point, integers are limited by ±(253-1).
bigint for integer numbers of arbitrary length.
string for strings. A string may have zero or more characters, there’s no separate single-character type.
boolean for true/false.
null for unknown values – a standalone type that has a single value null.
undefined for unassigned values – a standalone type that has a single value undefined.
symbol for unique identifiers.
And one non-primitive data type:
object for more complex data structures.
The typeof operator allows us to see which type is stored in a variable.

Usually used as typeof x, but typeof(x) is also possible.
Returns a string with the name of the type, like "string".
For null returns "object" – this is an error in the language, it’s not actually an object.

let name = "Ilya";

// the expression is a number 1
alert( `hello ${1}` ); // hello 1

// the expression is a string "name"
alert( `hello ${"name"}` ); // hello name

// the expression is a variable, embed it
alert( `hello ${name}` ); // hello Ilya
*/

// ============================================================
// Page shell — you don't need to touch anything below this line
// until Phase 2 when you'll understand exactly what it's doing.
// ============================================================

export default function Learning() {
  const [output, setOutput] = useState([]);
  const [ran, setRan] = useState(false);

  function handleRun() {
    const lines = [];

    function log(...args) {
      const text = args
        .map((a) =>
          typeof a === "object" ? JSON.stringify(a, null, 2) : String(a)
        )
        .join(" ");
      lines.push(text);
    }

    try {
      runExercises(log);
    } catch (err) {
      lines.push(`❌ Error: ${err.message}`);
    }

    setOutput(lines.length ? lines : ["(nothing logged yet)"]);
    setRan(true);
  }

  function handleClear() {
    setOutput([]);
    setRan(false);
  }

  return (
    <div style={styles.page}>
      <div style={styles.sidebar}>
        <p style={styles.label}>LEARNING PLAYGROUND</p>
        <p style={styles.hint}>
          Write your exercises in <code style={styles.code}>runExercises()</code> at the top of
          this file. Use <code style={styles.code}>log()</code> instead of{" "}
          <code style={styles.code}>console.log()</code> to see output here.
        </p>
        <button style={styles.runBtn} onClick={handleRun}>
          ▶ Run
        </button>
        {ran && (
          <button style={styles.clearBtn} onClick={handleClear}>
            Clear
          </button>
        )}
      </div>

      <div style={styles.output}>
        <p style={styles.outputLabel}>Output</p>
        {output.length === 0 ? (
          <p style={styles.placeholder}>Hit Run to see your output here.</p>
        ) : (
          output.map((line, i) => (
            <pre key={i} style={styles.line}>
              {line}
            </pre>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    display: "flex",
    height: "100vh",
    fontFamily: "'Courier New', monospace",
    background: "#0f0f0f",
    color: "#e8e8e8",
  },
  sidebar: {
    width: 240,
    flexShrink: 0,
    padding: "32px 24px",
    borderRight: "1px solid #222",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  label: {
    fontSize: 11,
    letterSpacing: "0.15em",
    color: "#555",
    margin: 0,
  },
  hint: {
    fontSize: 13,
    color: "#888",
    lineHeight: 1.6,
    margin: 0,
  },
  code: {
    background: "#1e1e1e",
    padding: "1px 5px",
    borderRadius: 3,
    fontSize: 12,
    color: "#c8a96e",
  },
  runBtn: {
    background: "#c8a96e",
    color: "#0f0f0f",
    border: "none",
    borderRadius: 4,
    padding: "10px 0",
    fontFamily: "'Courier New', monospace",
    fontWeight: "bold",
    fontSize: 14,
    cursor: "pointer",
    letterSpacing: "0.05em",
  },
  clearBtn: {
    background: "transparent",
    color: "#555",
    border: "1px solid #333",
    borderRadius: 4,
    padding: "8px 0",
    fontFamily: "'Courier New', monospace",
    fontSize: 13,
    cursor: "pointer",
  },
  output: {
    flex: 1,
    padding: "32px 28px",
    overflowY: "auto",
  },
  outputLabel: {
    fontSize: 11,
    letterSpacing: "0.15em",
    color: "#555",
    margin: "0 0 20px 0",
  },
  placeholder: {
    color: "#444",
    fontSize: 14,
    margin: 0,
  },
  line: {
    margin: "0 0 6px 0",
    fontSize: 14,
    lineHeight: 1.6,
    color: "#b8e0b8",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
};