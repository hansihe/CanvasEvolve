window.onload = function() {

    var originalCanvas = document.getElementById('o').getContext('2d');
    var evolveCanvas = document.getElementById('c').getContext('2d');

    var originalImage = document.getElementById('i1');
    originalCanvas.drawImage(originalImage, 0, 0, 200, 200);

    var genCounter = document.getElementById('gen-counter');
    var generation = 0;
    function increaseGeneration() {
        generation += 1;
    }

    setInterval(function() {genCounter.innerHTML = generation;}, 100);

    function randomIntFromInterval(min, max) {
        return Math.floor(Math.random()*(max-min+1)+min);
    }

    function r(max) {
        return randomIntFromInterval(0, max);
    }

    Number.prototype.clamp = function (min, max) {
        return Math.min(Math.max(this, min), max);
    };

    Array.prototype.remove = function(from, to) {
        var rest = this.slice((to || from) + 1 || this.length);
        this.length = from < 0 ? this.length + from : from;
        return this.push.apply(this, rest);
    };

    /*function compareCanvas(c1, c2) {
        var width = 200;
        var height = 200;

        var c1d = c1.getImageData(0, 0, width, height);
        var c2d = c2.getImageData(0, 0, width, height);

        var imageSize = width * height;
        var imageScore = 0;

        var currentRow = 0;
        var currentCol = 0;
        var currentIndex = 0;

        var c1c = null;
        var c2c = null;
        for (var i = 0; i < imageSize; i++) {
            currentRow = Math.floor(i / width);
            currentCol = i % width;
            currentIndex = i * 4;

            c1c = Array.prototype.slice.call(c1d.data, currentIndex, currentIndex+4);
            c2c = Array.prototype.slice.call(c2d.data, currentIndex, currentIndex+4);

            c1a = c1c[3] / 255;
            c2a = c2c[3] / 255;

            var pixelScore = (
                Math.abs((c1c[0] * c1a) - (c2c[0] * c2a)) +
                Math.abs((c1c[1] * c1a) - (c2c[1] * c2a)) +
                Math.abs((c1c[2] * c1a) - (c2c[2] * c2a))
                ) / 3 / 255;
            imageScore += pixelScore;
        }

        return imageScore / imageSize;
    }*/

    function compareCanvas(c1, c2) {

        var skip = 1;

        var width = 200 / skip;
        var height = 200 / skip;

        var c1d = c1.getImageData(0, 0, width * skip, height * skip);
        var c2d = c2.getImageData(0, 0, width * skip, height * skip);

        var imageSize = width * height;
        var imageScore = 0;

        var rI = 0;
        var currentRow = 0;
        var currentCol = 0;
        var currentIndex = 0;

        var c1c = null;
        var c2c = null;
        for (var i = 0; i < imageSize; i++) {
            rI = i * skip;
            currentRow = Math.floor(i / width);
            currentCol = i % width;
            currentIndex = rI * 4;

            //c1c = Array.prototype.slice.call(c1d.data, currentIndex, currentIndex+4);
            //c2c = Array.prototype.slice.call(c2d.data, currentIndex, currentIndex+4);

            c1a = c1d.data[currentIndex + 3] / 255;
            c2a = c2d.data[currentIndex + 3] / 255;

            var pixelScore = (
                Math.abs((c1d.data[currentIndex + 0] * c1a) - (c2d.data[currentIndex + 0] * c2a)) +
                Math.abs((c1d.data[currentIndex + 1] * c1a) - (c2d.data[currentIndex + 1] * c2a)) +
                Math.abs((c1d.data[currentIndex + 2] * c1a) - (c2d.data[currentIndex + 2] * c2a))
                ) / 3 / 255;
            imageScore += pixelScore;
        }

        return imageScore / imageSize;
    }

    //console.log(compareCanvas(originalCanvas, evolveCanvas));

    function drawDesc(canvas, desc) {
        //canvas.clearRect(0, 0, 200, 200);
        canvas.fillStyle = "rgba(255, 255, 255, 1)";
        canvas.fillRect(0, 0, 200, 200);

        for (var descIndex = 0; descIndex < desc.length; descIndex++) {
            var element = desc[descIndex];

            canvas.fillStyle = 'rgba(' + element[0][0] + ', ' + element[0][1] + ', ' + element[0][2] + ', ' + element[0][3] + ')';
            canvas.beginPath();
            canvas.moveTo(element[1][0], element[1][1]);
            canvas.lineTo(element[2][0], element[2][1]);
            canvas.lineTo(element[3][0], element[3][1]);
            canvas.closePath();
            canvas.fill();
        }
    }

    function copyArrayStruct(struct) {
        if (struct instanceof Array) {
            var newArray = [];
            for (var elementId = 0; elementId < struct.length; elementId++) {
                newArray.push(copyArrayStruct(struct[elementId]))
            }
            return newArray;
        } else {
            return struct;
        }
    }

    // Mutation types
    var MUTATE_MOVE_VERTEX = 0;
    var MUTATE_ADD_POLY = 1;
    var MUTATE_COLOR = 2;
    var MUTATE_REMOVE_ELEMENT = 3;
    var MUTATE_ALPHA = 4;

    var mutationTypes = [MUTATE_MOVE_VERTEX, MUTATE_ADD_POLY, MUTATE_COLOR, MUTATE_REMOVE_ELEMENT, MUTATE_ALPHA];

    var mutationStateTracker = {
        totalTries: 0,
        mutationTries: [],
        mutationSuccess: [],
        mutationSuccessWaterfall: [],
        reportMutation: function (type, success) {
            if (mutationStateTracker.mutationTries[type] === undefined) {
                mutationStateTracker.mutationTries[type] = 0;
            }
            if (mutationStateTracker.mutationSuccess[type] === undefined) {
                mutationStateTracker.mutationSuccess[type] = 0;
            }
            if (mutationStateTracker.mutationSuccessWaterfall[type] === undefined) {
                mutationStateTracker.mutationSuccessWaterfall[type] = 0;
            }

            mutationStateTracker.totalTries += 1;
            mutationStateTracker.mutationTries[type] += 1;
            if (success) {
                mutationStateTracker.mutationSuccess[type] += 1;
                for (var i = 0; i <= type; i++) {
                    mutationStateTracker.mutationSuccessWaterfall[i] += 1;
                }
            }
        }
    };

    var mutationWeights = {};
    mutationWeights[MUTATE_MOVE_VERTEX] = 4;
    mutationWeights[MUTATE_ADD_POLY] = 1;
    mutationWeights[MUTATE_COLOR] = 2;
    mutationWeights[MUTATE_REMOVE_ELEMENT] = 1;
    mutationWeights[MUTATE_ALPHA] = 2;

    var mutationWeightSum = 10;

    function mutateDesc(desc) {
        var op = -1;

        // Tinker with this, it adjusts how many generations it takes before mutation types get weighted.
        /*if (mutationStateTracker.totalTries > 100000) {
            var num = randomIntFromInterval(0, mutationStateTracker.totalTries);
            for (var i = 0; i < mutationTypes.length; i++) {
                var type = mutationTypes[i];
                if ((num -= mutationStateTracker.mutationSuccess[type]) <= 0) {
                    op = type;
                    break;
                }
            }
        } else {
            op = randomIntFromInterval(0, mutationTypes.length-1);
        }*/
        var num = randomIntFromInterval(0, mutationWeightSum-1);
        for (var i = 0; i < mutationTypes.length; i++) {
            if ((num -= mutationWeights[mutationTypes[i]]) < 0) {
                op = mutationTypes[i];
                break;
            }
        }

        if (op == MUTATE_MOVE_VERTEX) { // Move point
            var drawElement = desc[randomIntFromInterval(0, desc.length-1)];
            var coordElement = drawElement[randomIntFromInterval(1, 3)];
            //var axisId = randomIntFromInterval(0, 1);

            //coordElement[axisId] = coordElement[axisId] + randomIntFromInterval(-20, 20);
            coordElement[0] = coordElement[0] + randomIntFromInterval(-10, 10);
            coordElement[1] = coordElement[1] + randomIntFromInterval(-10, 10);
        } else if (op == MUTATE_ADD_POLY) { // Add poly
            if (desc.length >= 800) {
                mutateDesc(desc);
                return;
            }
            desc.push([[r(255), r(255), r(255), Math.random()], [r(200), r(200)], [r(200), r(200)], [r(200), r(200)]]);
        } else if (op == MUTATE_COLOR) { // Mutate color
            var drawElement = desc[randomIntFromInterval(0, desc.length-1)];
            var colorElement = randomIntFromInterval(0, 2);

            drawElement[0][colorElement] = (drawElement[0][colorElement] + randomIntFromInterval(-40, 40)).clamp(0, 255);
        } else if (op == MUTATE_REMOVE_ELEMENT) { // Remove element
            var targetElement = randomIntFromInterval(0, desc.length-1);
            desc.remove(targetElement);

        } else if (op == MUTATE_ALPHA) { // Mutate alpha
            var elementId = randomIntFromInterval(0, desc.length-1);
            var drawElement = desc[randomIntFromInterval(0, desc.length-1)];

            drawElement[0][3] = (drawElement[0][3] + (Math.random() - 0.5)).clamp(0, 1);
            // If the alpha is zero, we might as well remove the element.
            if (drawElement[0][3] == 0) {
                desc.remove(elementId);
            }
        }

        return op;
    }

    /*function mutateDesc(desc) {
        var op = randomIntFromInterval(0, 7);

        if (op <= 3) { // Move point
            var drawElement = desc[randomIntFromInterval(0, desc.length-1)];
            var coordElement = drawElement[randomIntFromInterval(1, 3)];
            //var axisId = randomIntFromInterval(0, 1);

            //coordElement[axisId] = coordElement[axisId] + randomIntFromInterval(-20, 20);
            coordElement[0] = coordElement[0] + randomIntFromInterval(-10, 10);
            coordElement[1] = coordElement[1] + randomIntFromInterval(-10, 10);
        } else if (op == 4) { // Add poly
            if (desc.length >= 800) {
                mutateDesc(desc);
                return;
            }
            desc.push([[r(255), r(255), r(255), Math.random()], [r(200), r(200)], [r(200), r(200)], [r(200), r(200)]]);
        } else if (op == 5) { // Mutate color
            var drawElement = desc[randomIntFromInterval(0, desc.length-1)];
            var colorElement = randomIntFromInterval(0, 2);

            drawElement[0][colorElement] = (drawElement[0][colorElement] + randomIntFromInterval(-40, 40)).clamp(0, 255);
        } else if (op == 6) { // Remove element
            var targetElement = randomIntFromInterval(0, desc.length-1);
            desc.remove(targetElement);
        } else if (op == 7) { // Mutate alpha
            var elementId = randomIntFromInterval(0, desc.length-1);
            var drawElement = desc[randomIntFromInterval(0, desc.length-1)];

            drawElement[0][3] = (drawElement[0][3] + (Math.random() - 0.5)).clamp(0, 1);
            // If the alpha is zero, we might as well remove the element.
            if (drawElement[0][3] == 0) {
                desc.remove(elementId);
            }
        }

        return op;
    }*/

    Math.seedrandom("test2");
    console.log("====");

    evolveCanvas.fillStyle = 'rgba(100, 100, 100, 0.6)';

    var desc = [
        [[r(255), r(255), r(255), Math.random()], [r(200), r(200)], [r(200), r(200)], [r(200), r(200)]]
    ];
    drawDesc(evolveCanvas, desc);
    var currDiff = compareCanvas(originalCanvas, evolveCanvas);

    function iterate() {
        increaseGeneration();

        var newDesc = copyArrayStruct(desc);
        var mutationType = mutateDesc(newDesc);
        drawDesc(evolveCanvas, newDesc);

        var newDiff = compareCanvas(originalCanvas, evolveCanvas);
        if (newDiff < currDiff) {
            currDiff = newDiff;
            desc = newDesc;

            mutationStateTracker.reportMutation(mutationType, true);
        } else {
            mutationStateTracker.reportMutation(mutationType, false);
        }
    }

    function runCluster() {
        for (var i = 0; i < 100; i++) {
            iterate();
        }

        setTimeout(runCluster, 0);
    }

    setTimeout(runCluster, 0);

};
