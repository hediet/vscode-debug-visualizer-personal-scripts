// @ts-check

/**
 * @type {import("@hediet/visualization-core").RegisterVisualizerFn}
 */
 module.exports = (register, lib) => {
    const sj = lib.semanticJson;
    
    register({
        id: 'MyersDiffAlgorithm',
        name: 'MyersDiffAlgorithm',
        serializer: sj.sOpenObject({
            kind: sj.sOpenObject({ MyersDiffAlgorithm: sj.sLiteral(true) }),
            textX: sj.sString(),
            textY: sj.sString(),
            k: sj.sOptionalProp(sj.sNumber()),
            Vpos: sj.sArrayOf(sj.sNumber()),
            Vneg: sj.sArrayOf(sj.sNumber()),
            x: sj.sOptionalProp(sj.sNumber()),
            y: sj.sOptionalProp(sj.sNumber()),
            step: sj.sOptionalProp(sj.sNumber()),
            d: sj.sNumber(),
            maxXofDLineTop: sj.sOptionalProp(sj.sNumber()),
            maxXofDLineLeft: sj.sOptionalProp(sj.sNumber()),
            pathsPos: sj.sArrayOf(sj.sArrayOf(sj.sOpenObject({
                x: sj.sNumber(),
                y: sj.sNumber(),
                length: sj.sNumber(),
            }))),
            pathsNeg: sj.sArrayOf(sj.sArrayOf(sj.sOpenObject({
                x: sj.sNumber(),
                y: sj.sNumber(),
                length: sj.sNumber(),
            }))),
        }),
        getVisualization: (data, self) =>
            lib.createCanvas2DVisualization(
                self,
                { priority: 1000, /*interpolate: false /*size: { width: 1000, height: 1000 } interpolate: false */ },
                context => {
                    function getDiagVal(posArr, negArr, idx) {
                        return idx < 0 ? negArr[-idx - 1] : posArr[idx];
                    }

                    const currentK = data.k;
                    
                    context.canvas.style.width = '100%';
                    context.canvas.style.height = '100%';
                    const maxX = data.textX.length;
                    const maxY = data.textY.length;
                    const cellSize = 60;
                    context.canvas.width = maxY * cellSize + 200;
                    context.canvas.height = context.canvas.width / context.canvas.clientWidth * context.canvas.clientHeight;
                    context.font = '40px monospace';

                    const margin = 50;

                    for (let x = 0; x < maxX; x++) {
                        context.fillText(data.textX[x], (x + 1) * cellSize + margin, margin);
                    }
                    for (let y = 0; y < maxY; y++) {
                        context.fillText(data.textY[y], margin, (y + 1) * cellSize + margin);
                    }

                    function getPos(x, y) {
                        return ({
                            x: (x) * cellSize + cellSize / 1.5 + margin,
                            y: (y) * cellSize + cellSize / 5 + margin,
                        });
                    }


                    // draw a dot at each cell
                    for (let i = 0; i < maxX + 1; i++) {
                        for (let j = 0; j < maxY + 1; j++) {
                            context.fillStyle = (i === data.x && j === data.y && (data.step ?? 0) >= 2) ? "green" : "lightgrey";
                            const p = getPos(i, j);
                            context.fillRect(p.x, p.y, 5, 5);
                            context.fillStyle = "#000000";
                            context.font = '9px monospace';
                            context.fillText(`${i},${j}`, p.x + 10, p.y + 10);
                        }
                    }
                    

                    // draw diagonal lines. Diagonal d=0 is the main diagonal
                    for (let k = -100; k < 100; k++) {
                        // All points where x-y = d.
                        if (k < -data.d || k > data.d) {
                            // These diagonals are not computed yet.
                            continue;
                        }

                        context.strokeStyle = k === data.k ? "blue" : "lightgrey";
                        context.beginPath();
                        
                        const diagonalStart = getPos(-Math.min(0, -k), Math.max(0, -k));
                        context.moveTo(diagonalStart.x, diagonalStart.y);
                        const diagonalEnd = getPos(maxX * 2, -k + maxX * 2);
                        context.lineTo(diagonalEnd.x, diagonalEnd.y);
                        context.stroke();
                        context.closePath();

                        
                        const diagX = getDiagVal(data.Vpos, data.Vneg, k);
                        const path = getDiagVal(data.pathsPos, data.pathsNeg, k);
                        if (path) {
                            let lastPos = getPos(diagX, diagX - k);
                            const p = [...path, { x: 0, y: 0, length: 0 }];
                            const pathLen = p.reduce((a, b) => a + b.length, 0);

                            context.fillStyle = "red";
                            context.font = '10px monospace';
                            // How many non-diagonals were taken?
                            context.fillText(`-${diagX * 2 - k - pathLen * 2}`, lastPos.x + 10, lastPos.y);

                            for (const item of p) {
                                context.strokeStyle = "green";
                                context.beginPath();
                                context.moveTo(lastPos.x, lastPos.y);
                                const t = getPos(item.x + item.length, item.y + item.length);
                                context.lineTo(lastPos.x, t.y);
                                context.lineTo(t.x, t.y);
                                const p = getPos(item.x, item.y);
                                context.lineTo(p.x, p.y);
                                context.stroke();
                                context.closePath();
                                lastPos = p;
                            }
                        }

                        if (k === data.k && (data.step ?? 0) >= 1) {
                            if (data.maxXofDLineTop !== undefined && data.maxXofDLineTop !== -1) {
                                context.fillStyle = "red";
                                const p = getPos(data.maxXofDLineTop, data.maxXofDLineTop - k - 1);
                                context.fillRect(p.x, p.y, 5, 5);
                                context.fillStyle = "#000000";
                                context.font = '9px monospace';
                            }

                            if (data.maxXofDLineLeft !== undefined && data.maxXofDLineLeft !== -1) {
                                context.fillStyle = "red";
                                const p = getPos(data.maxXofDLineLeft - 1, data.maxXofDLineLeft - k);
                                context.fillRect(p.x, p.y, 5, 5);
                                context.fillStyle = "#000000";
                                context.font = '9px monospace';
                            }
                        }
                        
                        
                        
                        if (diagX !== undefined) {
                            let p;
                            if (k <= 0) {
                                p = getPos(0, -k);
                            } else {
                                p = getPos(k, 0);
                            }
                            context.font = '10px monospace';
                            context.fillStyle = "red";
                            context.fillText(`V[${k}]:${diagX}`, p.x - 70, p.y - 45);
                            context.fillStyle = "black";
                        }
                    }
                    

                    
                    
                }
            )
    });


    register({
        id: 'customVis',
        name: 'Dynamic Programming Diff Vis',
        serializer: sj.sOpenObject({
            kind: sj.sOpenObject({ DynamicProgrammingDiffing: sj.sLiteral(true) }),
            lengths: sj.sArrayOf(sj.sNumber()),
            directions: sj.sArrayOf(sj.sNumber()),
            score: sj.sArrayOf(sj.sNumber()),
            width: sj.sNumber(),
            height: sj.sNumber(),
            text1: sj.sString(),
            text2: sj.sString(),
        }),
        getVisualization: (data, self) =>
            lib.createCanvas2DVisualization(
                self,
                { priority: 1000, /*interpolate: false /*size: { width: 1000, height: 1000 } interpolate: false */ },
                context => {
                    context.canvas.style.width = '100%';
                    context.canvas.style.height = '100%';
                    context.canvas.width = data.height * 10 + 100;
                    context.canvas.height = context.canvas.width / context.canvas.clientWidth * context.canvas.clientHeight;
                    context.font = '12px monospace';

                    for (let i = 0; i < data.width; i++) {
                        context.fillText(data.text1[i], 10, i * 10 + 20);
                    }
                    for (let i = 0; i < data.height; i++) {
                        context.fillText(data.text2[i], i * 10 + 20, 10);
                    }

                    for (let i = 0; i < data.width; i++) {
                        for (let j = 0; j < data.height; j++) {
                            /*if (data.text1[i] !== data.text2[j]) {
                                continue;
                            }*/


                            const idx = i + j * data.width;
                            const value = data.score[idx];
                            const direction = data.directions[idx];
                            context.fillStyle = `hsl(${value * 10}, 100%, 50%)`;
                            context.fillRect(j * 10 + 20, i * 10 + 10, 10, 10);
                        


                            if (direction === 3) {
                                context.fillStyle = 'black';
                                context.fillText('↖', j * 10 + 20, i * 10 + 20);
                            } else if (direction === 1) {
                                context.fillStyle = 'black';
                                context.fillText('↑', j * 10 + 20, i * 10 + 20);
                            } else if (direction === 2) {
                                context.fillStyle = 'black';
                                context.fillText('←', j * 10 + 20, i * 10 + 20);
                            }
                        }
                    }
                }
            )
    });
};
