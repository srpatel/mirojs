# mirojs

Simple Javascript sketchpad with no dependencies.

Include js and css files:

    <script src="miro.js"></script>
    <link href="miro.css" rel="stylesheet" type="text/css">

Create mirojs sketchpad:

    Miro.create(
        document.getElementById('miro-holder')
    );

The element passed to `Miro.create` must already exist.
