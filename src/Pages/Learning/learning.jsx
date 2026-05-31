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

function runExercises(log) {
    name = prompt("Name", ["type name here"]);
    alert(`Your name is ${name}`);
    confirm(`Is ${name} your name?`);
    return;
  
}
String Conversion
let value = true;
alert(typeof value); // boolean

value = String(value); // now value is a string "true"
alert(typeof value); // string

Numeric Conversion
let str = "123";
alert(typeof str); // string

let num = Number(str); // becomes a number 123

alert(typeof num); // number

alert( Number("   123   ") ); // 123
alert( Number("123z") );      // NaN (error reading a number at "z")
alert( Number(true) );        // 1
alert( Number(false) );       // 0

Boolean Conversion
alert( Boolean(1) ); // true
alert( Boolean(0) ); // false

alert( Boolean("hello") ); // true
alert( Boolean("") ); // false

What are the final values of all variables a, b, c and d after the code below?

let a = 1, b = 1;

let c = ++a; // ? my answer: c = 2
let d = b++; // ? my answer: d = 1
my answers:
a = 2 correct
b = 1 corrected to 2 (post increments still increment but return the old value in the expression)
c = 2 correct
d = 1 correct

What are the values of a and x after the code below?

let a = 2;

let x = 1 + (a *= 2);   // my answer: x = 5 a = 4  - correct

What are results of these expressions?

"" + 1 + 0   // my answer: 1  correct = "10" - addition with a string converts numbers to string
"" - 1 + 0      // my answer: -1 correct - subtraction only works with numbers so converts strings to numbers
true + false        // my answer: 1 correct
6 / "3"         // my answer: 2 correct
"2" * "3"       // my answer: 6 correct
4 + 5 + "px"       // my answer: 9px corrected = "9px"
"$" + 4 + 5     // my answer: $45  corrected = "$45"
"4" - 2         // my answer: 2 correct
"4px" - 2       // my answer: undefined corrected = NaN
"  -9  " + 5       // my answer: -4 correct = "  -9   5" - addition with string appends 5 to string
"  -9  " - 5    // my answer: -14 correct - subtraction converts strings to numbers
null + 1        // my answer: null  corrected = 1 Null becomes 0 after numeric conversion
undefined + 1      // my answer: undefined corrected = NaN - undefined becomes NaN after numeric conversion
" \t \n" - 2    // my answer: undefined correct = -2 - Space characters are trimmed off string start 
and end when a string is converted to a number. Here the whole string consists of space characters, 
such as \t, \n and a “regular” space between them. So, similarly to an empty string, it becomes 0.

Here’s a code that asks the user for two numbers and shows their sum.

It works incorrectly. The output in the example below is 12 (for default prompt values).

Why? Fix it. The result should be 3.

let a = prompt("First number?", 1);
let b = prompt("Second number?", 2);

alert(a + b); // 12

function runExercises(log){
let a = prompt("First number?", 1);
let b = prompt("Second number?", 2);

alert(a + b); // 12
}
The reason is that prompt returns user input as a string.

So variables have values "1" and "2" respectively.

let a = "1"; // prompt("First number?", 1);
let b = "2"; // prompt("Second number?", 2);

alert(a + b); // 12
What we should do is to convert strings to numbers before +. For example, using Number() or prepending them with +.

For example, right before prompt:

let a = +prompt("First number?", 1);
let b = +prompt("Second number?", 2);

alert(a + b); // 3
Or in the alert:

let a = prompt("First number?", 1);
let b = prompt("Second number?", 2);

alert(+a + +b); // 3
Using both unary and binary + in the latest code. Looks funny, doesn’t it?

Comparison operators return a boolean value.
Strings are compared letter-by-letter in the “dictionary” order.
When values of different types are compared, they get converted to numbers (with the exclusion of a strict equality check).
The values null and undefined are equal == to themselves and each other, but do not equal any other value.
Be careful when using comparisons like > or < with variables that can occasionally be null/undefined. Checking for null/undefined separately is a good idea.
What will be the result for these expressions?

1. 5 > 4                   my answer: true - correct
2. "apple" > "pineapple"   my answer: false - correct
3. "2" > "12"              my answer: false - incorrect (true)
4. undefined == null       my answer: true - correct  *not strict equality*
5. undefined === null      my answer: true - incorrect (false) *strict equality*
6. null == "\n0\n"         my answer: not sure - false
7. null === +"\n0\n"       my answer: not sure - false
1. Obviously, true.
2. Dictionary comparison, hence false. "a" is smaller than "p".
3. Again, dictionary comparison, first char "2" is greater than the first char "1".
4. Values null and undefined equal each other only.
5. Strict equality is strict. Different types from both sides lead to false.
6. Similar to (4), null only equals undefined.
7. Strict equality of different types.

Conditional Branching

Will alert be shown?

if ("0") {
  alert( 'Hello' );
}

my answer: no - 0 is falsy

Using the if..else construct, write the code which asks: ‘What is the “official” name of JavaScript?’

If the visitor enters “ECMAScript”, then output “Right!”, otherwise – output: “You don’t know? ECMAScript!”


export function runExercises(log) {
let answer = prompt('What is the official name of Javascript?', ["type answer here"])
if (answer == "ECMAScript") {
alert("Right!")
} else {
alert("You don't know? ECMAScript!")  }
}


Using if..else, write the code which gets a number via prompt and then shows in alert:

1, if the value is greater than zero,
-1, if less than zero,
0, if equals zero.
In this task we assume that the input is always a number.

export function runExercises(log) {
let number = prompt("Input a number",[0])
if (number > 0) {
alert(1)
} else if (number < 0){
 alert(-1)
 } else if (number == 0){
  alert(0)}
}


Rewrite this if using the conditional operator '?':

let result;

if (a + b < 4) {
  result = 'Below';
} else {
  result = 'Over';
}
  
 let a = 3
 let b = 2
export function runExercises(log){
let result = (a + b < 4) ? alert('Below'): alert('Over');
}

Rewrite if..else using multiple ternary operators '?'.

For readability, it’s recommended to split the code into multiple lines.

let message;

if (login == 'Employee') {
  message = 'Hello';
} else if (login == 'Director') {
  message = 'Greetings';
} else if (login == '') {
  message = 'No login';
} else {
  message = '';
}

export function runExercises(log) {
    let login = prompt('Login Username', [])
    let message = (login == 'Employee') ? 'Hello':
    (login == 'Director') ? 'Greetings':
    'No login';

    alert( message );
}

Logical Operators:
|| = OR -returns first truthy value or last       && = AND - returns first falsy value or last
What is the code below going to output?
alert( null || 2 || undefined );
my answer: 2 - correct


What will the code below output?
alert( alert(1) || 2 || alert(3) );
my answer: alert(1), then 2.
The call to alert does not return a value. Or, in other words, it returns undefined.
The first OR || evaluates its left operand alert(1). That shows the first message with 1.
The alert returns undefined, so OR goes on to the second operand searching for a truthy value.
The second operand 2 is truthy, so the execution is halted, 2 is returned and then shown by the outer alert.
There will be no 3, because the evaluation does not reach alert(3).

What is this code going to show?
alert( 1 && null && 2 );
my answer: alert null - correct
The answer: null, because it’s the first falsy value from the list.

What will this code show?
alert( alert(1) && alert(2) );
my answer: alert 2 - no falsy values so returns last 
The answer: 1, and then undefined.

alert( alert(1) && alert(2) );
The call to alert returns undefined (it just shows a message, so there’s no meaningful return).

Because of that, && evaluates the left operand (outputs 1), and immediately stops, because undefined is a falsy value. And && looks for a falsy value and returns it, so it’s done.


What will the result be?
alert( null || 2 && 3 || 4 );
my answer: null
The answer: 3.
alert( null || 2 && 3 || 4 );
The precedence of AND && is higher than ||, so it executes first.
The result of 2 && 3 = 3, so the expression becomes:
null || 3 || 4
Now the result is the first truthy value: 3.


Write an if condition to check that age is between 14 and 90 inclusively.
“Inclusively” means that age can reach the edges 14 or 90.


Write an if condition to check that age is NOT between 14 and 90 inclusively.
Create two variants: the first one using NOT !, the second one – without it.


Which of these alerts are going to execute?
What will the results of the expressions be inside if(...)?
if (-1 || 0) alert( 'first' );
if (-1 && 0) alert( 'second' );
if (null || -1 && 1) alert( 'third' );


Write the code which asks for a login with prompt.
If the visitor enters "Admin", then prompt for a password, if the input is an empty line or Esc 
– show “Canceled”, if it’s another string – then show “I don’t know you”.
The password is checked as follows:
If it equals “TheMaster”, then show “Welcome!”,
Another string – show “Wrong password”,
For an empty string or cancelled input, show “Canceled”
Please use nested if blocks. Mind the overall readability of the code.
Hint: passing an empty input to a prompt returns an empty string ''. Pressing ESC during a prompt returns null

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