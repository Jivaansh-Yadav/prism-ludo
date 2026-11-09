<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0a0c22,55:1f2560,100:36dec0&height=235&section=header&text=Prism%20Ludo&fontSize=46&fontColor=e8f6ff&fontAlignY=40&desc=A%20rotatable%203D%20Ludo%20table%20with%20a%20crystal%20die&descSize=17&descAlignY=62&animation=twinkling" alt="Prism Ludo" width="100%">

<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=500&size=19&duration=3200&pause=900&color=36dec0&center=true&vCenter=true&width=680&lines=Board%2C%20pawns%20and%20die%20built%20from%20geometry%2C%20not%20models;Two%20players%20sit%20opposite%20each%20other%20across%20the%20table;Bots%20score%20every%20legal%20token%20and%20pick%20the%20best" alt="Typing animation" />

<a href="https://jivaansh-yadav.github.io/prism-ludo/"><img src="https://img.shields.io/badge/Play%20Prism%20Ludo-jivaansh--yadav.github.io-36dec0?style=for-the-badge&labelColor=0b0f2b" alt="Play Prism Ludo" /></a>

<br />

<img src="https://img.shields.io/badge/Renderer-Three.js%20r170-36dec0?style=flat-square&labelColor=0b0f2b" alt="Three.js r170" />
<img src="https://img.shields.io/badge/Geometry-procedural-2ee0b8?style=flat-square&labelColor=0b0f2b" alt="Procedural geometry" />
<img src="https://img.shields.io/badge/Seats-2%20%C2%B7%203%20%C2%B7%204-7b8cff?style=flat-square&labelColor=0b0f2b" alt="2, 3 or 4 seats" />
<img src="https://img.shields.io/badge/Bots-heuristic-ffcb62?style=flat-square&labelColor=0b0f2b" alt="Heuristic bots" />
<img src="https://img.shields.io/badge/Audio-6%20clips-ff6088?style=flat-square&labelColor=0b0f2b" alt="6 audio clips" />
<img src="https://img.shields.io/badge/Build-none-lightgrey?style=flat-square&labelColor=0b0f2b" alt="No build step" />

</div>

<br />

<div align="center">

<sub>Three files that ship as they are: <b>2,274 lines</b> of HTML, CSS and one ES module. No models, no textures, no bundler — the board, the pawns and the die are geometry, and the whole thing runs from GitHub Pages exactly as it sits in the repository.</sub>

</div>

---

<div align="center">

## What it is

</div>

Ludo, played on a table you can walk around. The 52-square track, four yards, four coloured lanes and the crystal die are all built in code at load time, then lit with a room environment so the pieces read as glass and lacquer rather than flat sprites.

You open the page, the tutorial tells you how a match works, and then you choose the table: **2, 3 or 4 players**, with any number of the seats given to **bots**. Two players is the interesting case — they sit at *opposite corners* rather than side by side, so the race runs diagonally across the board and neither colour starts with a shorter lane to its own home.

<div align="center">

<sub>Bots never roll or move on a timer that fires early: the scheduler hashes the whole game state and refuses to schedule twice for the same state.</sub>

</div>

---

<div align="center">

## The loop

</div>

Roll, pick a token, move. The rest is the rule set, and the rule set is what makes the bot interesting to play against:

- **A 6 opens the gate.** Only a 6 brings a token out of the yard, and a 6 also earns another roll — but three sixes in a row forfeits the turn.
- **One roll, one token.** Each token walks clockwise around the shared 52 squares, then turns into its own lane and finishes at position 56. An exact roll is required to land home.
- **Landing on a rival sends it back.** Unless the square is one of the 8 marked safe squares, landing on a single opposing token captures it and returns it to its yard.
- **Four tokens home wins.** The HUD counts `n/4` per seat, the winner sheet offers a rematch, and the rest of the table keeps its seats.

<div align="center">

<sub>Illegal moves are never offered: the tokens that can legally move are the only ones that glow, and they are the only ones the raycaster looks at.</sub>

</div>

---

<div align="center">

## What is inside

</div>

<ul>
<li><b>A board built from a path table</b> — <code>PATH</code> is 52 <code>[row, col]</code> pairs read once; tiles, safe-square rings and the four home lanes are all placed by walking it, so the geometry cannot drift out of step with the rules.</li>
<li><b>A second renderer for the die</b> — the die is a real <code>WebGLRenderer</code> in its own scene, mounted into the HUD slot, tumbling on its own camera. It is not a picture of a die.</li>
<li><b>Seat sets, not a player array</b> — <code>SEAT_SETS</code> decides which corners are in play; every yard plate that is not seated is tinted 86% toward the dark and its pawns are hidden.</li>
<li><b>Bots that read the board</b> — capture, finishing, leaving the yard, safe squares, and how close an enemy is behind the destination all move the score.</li>
<li><b>A tutorial before the table</b> — seven steps, one idea each, and the last button hands straight over to the seat picker instead of dropping you into a match you did not choose.</li>
<li><b>Sound you can silence</b> — one background loop and five effect clips, gated behind a single mute toggle that persists for the session.</li>
<li><b>Reduced motion respected</b> — the pulsing halos around legal tokens stop when the system asks for less movement; the camera still fits the board.</li>
</ul>

---

<div align="center">

## Stack

</div>

<pre><code>HTML            one page, semantic sections, no framework
CSS             custom properties, safe-area insets, one mobile breakpoint
JavaScript      ES modules, no build step
Three.js        r170 via import map · OrbitControls · RoundedBoxGeometry · RoomEnvironment
Audio           HTMLAudioElement, six MP3 clips
Fonts           Manrope, one weight range</code></pre>

---

<div align="center">

## Under the hood

</div>

<details>
<summary><b>The camera fits the board, not the window</b></summary>

<br />

<p>Fitting a 3D table into a portrait phone and a wide desktop with one zoom value does not work, so the distance is solved from the field of view on <i>both</i> axes and the larger requirement wins:</p>

<pre><code>const fovH = 2 * Math.atan(Math.tan(fovV / 2) * aspect);
const d = pad * Math.max(radiusX / Math.sin(fovH / 2), radiusY / Math.sin(fovV / 2));</code></pre>

<p>On a wide screen the match setup sheet sits to the right of the board, so the frame is nudged left by a fraction of the visible width — <code>frameBoard(2.2, 0.04, 0.21)</code> — instead of the board hiding behind the panel. Portrait gets its own padding and its own target height. The fit is re-run when the page crosses the 700 px breakpoint, and only then: resizing inside a breakpoint does not yank the camera.</p>

</details>

<details>
<summary><b>Two fingers move the camera, one finger turns it</b></summary>

<br />

<p>Zooming in is only useful if the part of the table you zoomed into can be reached, so the orbit controls pan as well as rotate: one finger turns the board, two fingers move the view and pinch to dolly. Panning is measured from whatever frame the current screen asked for — the tutorial frame, the sheet frame, the play frame — rather than from the world origin, which is why opening a panel never fights the camera position the player chose:</p>

<pre><code>const halfV = d * Math.tan((camera.fov * Math.PI) / 360);
const halfMin = Math.min(halfV, halfV * camera.aspect);
const limit = THREE.MathUtils.clamp(BOARD_REACH - halfMin, 1.1, BOARD_REACH);</code></pre>

<p>The allowance is the board's reach minus what the screen can already show, so at the default distance you can barely nudge the table, and by the time you are close enough to read a single token the whole board is reachable. The camera position is translated with the target so the clamp never changes the viewing angle, and the vertical allowance is smaller than the horizontal one so the table cannot be pushed under the floor.</p>

</details>

<details>
<summary><b>A bot that scores, not a bot that guesses</b></summary>

<br />

<p>Every legal token gets a number and the highest wins, with a little noise so two equally good moves are not always the same move:</p>

<pre><code>let score = next * 0.7 + Math.random() * 4;   // progress, plus a wobble
if (v &lt; 0)        score += 34;                // leaving the yard is worth something
if (next === 56)  score += 150;               // finishing is worth a lot
if (next &gt; 56)    score -= 400;               // walking past home is never legal
if (SAFE.has(dest)) score += 16;              // standing somewhere safe
if (occupants === 1) score += 120;            // a capture
if (hunting &amp;&amp; !SAFE.has(dest)) score -= 12;  // someone sits within 6 squares behind</code></pre>

<p>The last line is what makes it feel like an opponent: the bot avoids parking in front of a token that is six squares away and could take it next turn. It still plays the same rules you do — no extra rolls, no ignoring the six rule — because it picks from <code>legal</code>, which is the same list the glowing tokens come from.</p>

</details>

<details>
<summary><b>Every die face is a stored orientation</b></summary>

<br />

<p>The face is not chosen by physics or by painting a texture. Each value maps to a fixed Euler triple, so a roll tumbles the die on three axes for the length of the animation and then snaps to the orientation that shows the rolled number:</p>

<pre><code>dieGroup.rotation.set(s * 10, s * 13, s * 8);      // while rolling
dieGroup.position.y = Math.sin(s * Math.PI * 5) * 0.15;

dieGroup.rotation.set(...DICE_EULER[rollValue]);   // when it lands</code></pre>

<p>Pips are separate rounded boxes parented to the die group and projected onto the right faces, so the sequence 1 → 3 → 5 is readable from any camera angle, including the top view.</p>

</details>

<details>
<summary><b>Pieces move on an arc, and the game waits for them</b></summary>

<br />

<p>A move is a chain of positions resolved one after another, with a smoothstep tween lifting the pawn over the board in between. Because the promise resolves when the last hop lands, the next turn cannot start until the animation is done — and the bot scheduler is keyed to the same state signature, so a bot cannot fire a move on a board that is still in motion.</p>

</details>

---

<div align="center">

## Project structure

</div>

<pre><code>prism-ludo/
├── index.html          # the page: stage, HUD, sheets, import map
├── app.js              # board · pawns · die · rules · bots · camera · audio (1,530 lines)
├── styles.css          # layout, sheets, tokens, safe-area insets (600 lines)
├── favicon.svg         # the prism mark the tab shows
└── audio/              # bgm · roll · step · capture · home · win</code></pre>

---

<div align="center">

## Run it

</div>

<p>The hosted build is at <a href="https://jivaansh-yadav.github.io/prism-ludo/"><b>jivaansh-yadav.github.io/prism-ludo</b></a> — GitHub Pages serves the repository root as it is, with no build step and no workflow to watch. Nothing to install to play.</p>

<p>To run it locally:</p>

<pre><code>git clone https://github.com/Jivaansh-Yadav/prism-ludo.git
cd prism-ludo
python3 -m http.server 8000</code></pre>

<p>Then open <code>http://localhost:8000</code>. A server is required rather than a double-click, because the page loads Three.js through an import map and ES modules do not run from <code>file://</code>. All asset paths are relative, which is why the same files work from a bare folder, from <code>/prism-ludo/</code> on Pages, and from any other subdirectory.</p>

<p>Sound stays quiet until you touch the table, because browsers will not start audio without a gesture. If the room is silent after a roll, that is why.</p>

<div align="center">

<sub>Playable on a phone held sideways and on a desktop; the camera fits the frame either way.</sub>

</div>

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0a0c22,55:1f2560,100:36dec0&height=110&section=footer&reversal=true" alt="" width="100%">
