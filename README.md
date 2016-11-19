# showctrl

A very basic, but flexible, trigger-suite for controlling multiple devices during a live show.

<br>
app.js
>The node.js server which connects to all the devices (GrandMA2, QLab, Ross Xpression, Ross Carbonite) and user-interfaces (html-pages and websockets)

<br>
script-buttons.html - the main user interface.
> Easily add buttons as JSON-object in the html-file and trigger actions on the devices.

<br>
scoredisplay.html<br>
scoredisplay-slave.html<br>
scoredisplay-quad.html
> These files are part of a gameshow-concept showing the score and name for 4 contestants

<br>
quizmaster.html<br>
contestant.html
> These files are part of a quiz-element to the gameshow. You enter questions in the quizmaster.html file and push the questions to the server. The question-data is then sent to a MySql-server for use with datalinq and Xpression. The contestants can then select their answers in contestant.html
