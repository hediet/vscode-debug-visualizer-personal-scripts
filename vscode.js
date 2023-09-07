// @ts-check

/**
 * @type {import("@hediet/debug-visualizer-data-extraction").LoadDataExtractorsFn}
 */
module.exports = (register, helpers) => {

	register({
		id: 'MyersDiffAlgorithm',
		dataCtor: 'MyersDiffAlgorithm',
		getExtractions(data, collector, context) {
			function tryEval(
				obj
			) {
				const result = {};
				if (Array.isArray(obj)) {
					for (const val of obj) {
						try {
							result[val] = context.evalFn(val);
						} catch (e) {}
					}
				} else {
					for (const [key, val] of Object.entries(obj)) {
						try {
							result[key] = context.evalFn(val);
						} catch (e) {}
					}
				}
				return result;
			}

			
			function pathToArr(arr, path) {
				if (!path) {
					return arr;
				}
				arr.push({ x: path.x, y: path.y, length: path.length });
				return pathToArr(arr, path.prev);
			}

			collector.addExtraction({
				priority: 2000,
				extractData() {
					return {
						kind: { MyersDiffAlgorithm: true },
						textX: context.evalFn('seqX.text'),
						textY: context.evalFn('seqY.text'),
						Vpos: context.evalFn('[...V.positiveArr]'),
						Vneg: context.evalFn('[...V.negativeArr]'),
						pathsPos: context.evalFn('[...paths.positiveArr]').map(p => pathToArr([], p)),
						pathsNeg: context.evalFn('[...paths.negativeArr]').map(p => pathToArr([], p)),
						d: context.evalFn('d'),
						...tryEval({
							k: 'k',
							x: 'x',
							y: 'y',
							step: 'step',
							maxXofDLineTop: 'maxXofDLineTop',
							maxXofDLineLeft: 'maxXofDLineLeft',
						})
					}
				}
			});
		}
	});

	register({
		id: 'dynamicProgrammingDiffing',
		getExtractions(data, collector, context) {
			if (typeof data !== 'object' || !data || data.constructor.name !== 'DynamicProgrammingDiffing') {
				return;
			}

			collector.addExtraction({
				id: "dynamicProgrammingDiffing",
				name: "Dynamic Programming Diffing",
				priority: 2000,
				extractData() {
					return {
						kind: { DynamicProgrammingDiffing: true },
						lengths: context.evalFn('lengths.array'),
						directions: context.evalFn('directions.array'),
						score: context.evalFn('lcsLengths.array'),
						width: context.evalFn('lengths.width'),
						height: context.evalFn('lengths.height'),
						text1: context.evalFn('sequence1.text'),
						text2: context.evalFn('sequence2.text'),
					}
				}
			});
		}
	});



	register({
		id: 'table2',
		getExtractions(data, collector, context) {
			if (!Array.isArray(data)) {
				return;
			}
			if (!data.every(d => typeof d === "object" && d)) {
				return;
			}
	
			collector.addExtraction({
				id: "table2",
				name: "Table2",
				priority: 2000,
				extractData() {

					const rows = [];
					for (const r of data) {
						const entry = {};
						for (const k of Object.keys(r)) {
							let value = r[k];
							if (typeof value === 'object' && value) {
								if (value.toString !== undefined) {
								}
							}
							value = value.toString();
							entry[k] = value;
						}
						rows.push(entry);
					}

					return {
						kind: {
							table: true,
						},
						rows: rows,
					};
				},
			});
	
			collector.addExtraction({
				id: "table-with-type-name",
				name: "Table (With Type Name)",
				priority: 950,
				extractData() {
					return {
						kind: {
							table: true,
						},
						rows: data.map(d => ({ type: d.constructor.name, ...d })),
					};
				},
			});
		}
	});

	/*
	register({
		id: "positionOrRangeInTextModel",
		getExtractions(data, collector, context) {
			collector.addExtraction({
				priority: 100,
				id: "foo",
				name: "Foo",
				extractData() {
					return helpers.asData({
						kind: { text: true },
						text: Object.keys(context.variablesInScope).join(", "),
					});
				},
			});
		},
	});*/

	class PositionOffsetTransformer {
		lineStartOffsetByLineIdx = [];
	
		constructor(text) {
			this.lineStartOffsetByLineIdx = [];
			this.lineStartOffsetByLineIdx.push(0);
			for (let i = 0; i < text.length; i++) {
				if (text.charAt(i) === '\n') {
					this.lineStartOffsetByLineIdx.push(i + 1);
				}
			}
		}
	
		getOffset(lineIdx, charIdx) {
			return this.lineStartOffsetByLineIdx[lineIdx] + charIdx;
		}
	}

	register({
		id: "bracketPairColorizerAst",
		getExtractions(data, collector, context) {
			if (!data || (typeof data !== 'object') || data.constructor.name.indexOf('AstNode') === -1) {
				return;
			}

			/**
			 * @type {any}
			*/
			const node = data;

			const kinds = {
				0: 'Text',
				1: 'Bracket',
				2: 'Pair',
				3: 'UnexpectedClosingBracket',
				4: 'List',
			};	

			collector.addExtraction({
				priority: 1000,
				id: "stringRange",
				name: "String Range",
				extractData() {
					function lengthToString(length) {
						if (typeof length === 'object' && length) {
							return `${length.lineCount}:${length.columnCount}`;
						}
						const lineCount = Math.floor(length / 2**26);
						const colCount = length - lineCount * 2**26;
						return `${lineCount}:${colCount}`;
					}

					function toNode(node, delta) {
						const children = new Array();
						let d = delta;
						for (const c of node.children) {
							children.push(toNode(c, d));
							d += c.length;
						}
				
						return {
							span: { start: delta, length: node.length },
							children,
							isMarked: false,
							segment: "-",
							items: [{ text: `${kinds[node.kind]}, len: ${lengthToString(node.length)}` }],
						};
					}
				
					return {
						kind: { text: true, ast: true, tree: true },
						root: toNode(node, 0),
						text: node.src,
					};
				},
			});

		}
	});

	
	register({
		id: "offsetRange",
		dataCtor: "OffsetRange",
		getExtractions(/** @type any */ data, collector, context) {
			//if (!context.filePath.contains('standardLinesDiffComputer')) { return; }

			/** @type any */
			const sd = helpers.findVar({ nameSimilarTo: context.expression, ctor: 'LinesSliceCharSequence' });
			if (!sd) { return; }

			collector.addExtraction({
				priority: 2000,
				extractData() {
					return context.extract([sd.text, [data.start, data.endExclusive]]);
				}
			});
		}
	});

	register({
		id: "offsetRanges",
		//dataCtor: "Array",
		getExtractions(/** @type Array */ data, collector, context) {
			//if (!context.filePath.contains('standardLinesDiffComputer')) { return; }
			if (!Array.isArray(data) || !data.every(d => typeof d === "object" && d && d.constructor.name === "OffsetRange")) {
				return;
			}

			/** @type any */
			const sd = helpers.findVar({ nameSimilarTo: context.expression, ctor: 'LinesSliceCharSequence' });
			if (!sd) { return; }

			collector.addExtraction({
				priority: 2000,
				extractData() {
					return context.extract([sd.text, ...data.map(data => [data.start, data.endExclusive])]);
				}
			});
		}
	});

	register({
		id: "positionOrRangeInTextModel",
		getExtractions(data, collector, context) {
			/** @type {{ start: { line: number; column: number; }; end: { line: number; column: number; }; }} */
			let range;
			if (isRange(data)) {
				range = {
					start: {
						line: data.startLineNumber - 1,
						column: data.startColumn - 1,
					},
					end: {
						line: data.endLineNumber - 1,
						column: data.endColumn - 1,
					},
				};
			} else if (isPosition(data)) {
				range = {
					start: {
						line: data.lineNumber - 1,
						column: data.column - 1,
					},
					end: { line: data.lineNumber - 1, column: data.column - 1 },
				};
			} else {
				return;
			}

			if (!isRange(data) && !isPosition(data)) {
				return;
			}

			/** @type {any} */
			const textModel = helpers.find(
				(x) =>
					typeof x === "object" &&
					!!x &&
					"constructor" in x &&
					x.constructor.name === "TextModel"
			);

			/**
			 * @type {string}
			*/
			const value = textModel.getValue();

			const lines = value.split('\n');
			if (lines.length > 20) {
				const context = 10;
				collector.addExtraction({
					id: "positionOrRangeInTextModelContext",
					name: `Position/Range In TextModel (+/-${context} Lines)`,
					extractData() {

						const newStart = Math.max(0, range.start.line - context);

						const newLines = lines.slice(newStart, Math.max(0, range.end.line + context));

						return helpers.asData({
							kind: { text: true },
							text: newLines.join('\n'),
							decorations: [{ range: {
								start: { ...range.start, line: range.start.line - newStart }, 
								end: { ...range.end, line: range.end.line - newStart }, 
							} }],
						});
					},
					priority: 999,
				});
			}

			collector.addExtraction({
				id: "positionOrRangeInTextModel",
				name: "Position/Range In TextModel",
				extractData() {
					return helpers.asData({
						kind: { text: true },
						text: value,
						decorations: [{ range }],
					});
				},
				priority: 1000,
			});
		},
	});
};


/**
 * @return {value is { startColumn: number; startLineNumber: number; endColumn: number; endLineNumber: number; }}
 */
function isRange(value) {
	return (
		typeof value === "object" &&
		!!value &&
		"startColumn" in value &&
		"startLineNumber" in value
	);
}

/**
 * @return {value is { column: number; lineNumber: number }}
 */
function isPosition(value) {
	return (
		typeof value === "object" &&
		!!value &&
		"column" in value &&
		"lineNumber" in value
	);
}
