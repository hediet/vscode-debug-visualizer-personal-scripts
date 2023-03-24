// @ts-check

/**
 * @type {import("@hediet/visualization-core").RegisterVisualizerFn}
 */
 module.exports = (register, lib) => {
    const sj = lib.semanticJson;
    
    register({
        id: 'customVis',
        name: 'Custom Vis',
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
                { priority: 1000, /*size: { width: 1000, height: 1000 } interpolate: false */ },
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
