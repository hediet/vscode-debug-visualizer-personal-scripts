// @ts-check

/**
 * @type {import("@hediet/debug-visualizer-data-extraction").LoadDataExtractorsFn}
 */
module.exports = (register, helpers) => {
	/**
	 * @type {(value: any) => value is import("C:/dev/microsoft/vscode/src/vs/base/common/observableImpl/base").ObservableValue}
	 */
	function isObservableValue(value) {
		return value.constructor.name === "ObservableValue" || value.constructor.name === "DisposableObservableValue";
	}

	/**
	 * @type {(value: any) => value is import("C:/dev/microsoft/vscode/src/vs/base/common/observableImpl/derived").Derived}
	 */
	function isDerived(value) {
		return value.constructor.name === "Derived";
	}

	/**
	 * @type {(value: any) => value is import("C:/dev/microsoft/vscode/src/vs/base/common/observableImpl/autorun").AutorunObserver}
	 */
	function isAutorunObserver(value) {
		return value.constructor.name === "AutorunObserver";
	}

	/**
	 * @type {(value: any) => value is import("C:/dev/microsoft/vscode/src/vs/base/common/observableImpl/utils").FromEventObservable}
	 */
	function isEventObserver(value) {
		return value.constructor.name === "FromEventObservable";
	}

	function formatValue(value) {
		let result = "" + value;
		if (result.length > 20) {
			result = `${result.substr(0, 20)}...`;
		}
		return result;
	}

	/**
	 * @param {import("C:/dev/microsoft/vscode/src/vs/base/common/observableImpl/base").BaseObservable<any, any>} observable
	 */
	function getObservers(observable) {
		return observable["observers"];
	}

	/**
	 * @type {typeof import("./graph")}
	*/
	const helpers2 = helpers;
	
	/**
	 * @param {unknown} observable 
	 * @param {'all' | 'related'} mode 
	 * @param {(observable: any) => boolean} isFocusedFn
	 */
	function getData(observables, mode, isFocusedFn) {
		const { graph, roots } = helpers2.Graph.create(observables, i => {
			const isFocused = isFocusedFn(i); // observables.indexOf(i) !== -1;
			if (isObservableValue(i)) {
				return {
					data: {
						label: i.debugName + " (" + formatValue(i["_value"]) + ")",
						isFocused
					},
					edges: [...getObservers(i)].map((o) => ({
						to: o,
						data: undefined,
					})),
				};
			} else if (isDerived(i)) {
				const states = {
					0: "initial",
					1: "maybeStale",
					2: "stale",
					3: "upToDate"
				}
				return {
					data: {
						label: `${i.debugName}\n(${formatValue(i["value"])}) - ${i['updateCount']}`,
						isFocused,
						state: states[i["state"]],
					},
					edges: [
						...[...getObservers(i)].map((o) => ({
							to: o,
							data: undefined,
						})),
						...[...i.dependencies].map((d) => ({
							include: d,
						})),
					],
				};
			} else if (isAutorunObserver(i)) {
				const states = {
					1: "maybeStale",
					2: "stale",
					3: "upToDate"
				}
				return {
					data: {
						label: `${i.debugName} - ${i['updateCount']}`,
						isFocused,
						state: states[i["state"]],
					},
					edges: [
						...[...i.dependencies].map((d) => ({
							include: d,
						})),
					],
				};
			} else if (isEventObserver(i)) {
				return {
					data: {
						label: "event " + i.debugName,
						isFocused
					},
					edges: [
						...[...getObservers(i)].map((o) => ({
							to: o,
							data: undefined,
						})),
					],
				};
			}

			return {
				data: {
					label: `unknown: ${i.constructor.name}`,
					isFocused
				},
				edges: [],
			};
		});

		if (mode === "related") {
			graph.markReachableFrom(roots);
			graph.markReachableFromReversed(roots);
			
			graph.restrictToMarked();
		}

		return helpers.createGraph(graph.nodes, (i) => {
			return {
				label: i.data.label,
				edges: i.outs.map(o => ({ to: o.to, color: "#97c2fc" })),
				shape: "box",
				color: i.data.isFocused ? "lime" : "#97c2fc",
				borderColor: {
					"initial": "green",
					"maybeStale": "orange",
					"stale": "red",
					"upToDate": "green",
				}[i.data.state]
			}
		}, { maxSize: 100 });
	}

	register({
		id: "observable",
		getExtractions(data, collector, context) {
			if (!data || ![isObservableValue, isDerived, isAutorunObserver].some((f) => f(data))) {
				return;
			}
			collector.addExtraction({
				priority: 1000,
				id: "observables all",
				name: "Observable (All)",
				extractData() {
					return getData([data], 'all', i => i === data);
				},
			});

			collector.addExtraction({
				priority: 1001,
				id: "observables related",
				name: "Observable (Related)",
				extractData() {
					return getData([data], 'related', i => i === data);
				},
			});
		},
	});

	register({
		id: "observableState",
		getExtractions(data, collector, context) {
			if (data !== globalThis) {
				return;
			}

			context.addCallFrameRequest({
				methodName: "finish",
				pathRegExp: "",
			});

			context.addCallFrameRequest({
				methodName: "transaction",
				pathRegExp: "",
			});

			context.addCallFrameRequest({
				methodName: "_recomputeIfNeeded",
				pathRegExp: "",
			});
			context.addCallFrameRequest({
				methodName: "_runIfNeeded",
				pathRegExp: "",
			});

			const finishFrame = context.callFrameInfos.find(i => 'methodName' in i && i.methodName === "finish");
			if (finishFrame && !('methodName' in finishFrame)) {
				return;
			}

			const recomputeIfNeededFrame = context.callFrameInfos.find(i => 'methodName' in i && (i.methodName === "_recomputeIfNeeded" || i.methodName === "_runIfNeeded"));
			if (recomputeIfNeededFrame && !('methodName' in recomputeIfNeededFrame)) {
				return;
			}
			
			const txFrame = context.callFrameInfos.find(i => 'methodName' in i && i.methodName === "transaction");
			if (txFrame && !('methodName' in txFrame)) {
				return;
			}
			if (!txFrame && !finishFrame) {
				return;
			}

			collector.addExtraction({
				priority: 1000,
				extractData() {
					if (finishFrame) {
						const updatingObservers = finishFrame.vars['updatingObservers'];
						return getData(
							updatingObservers.map(o => o.observable),
							"related",
							i => i === recomputeIfNeededFrame?.vars['this']
						);
					}

					const tx = txFrame.vars['tx'];
					return getData(
						tx.updatingObservers.map(o => o.observable),
						"related",
						i => 
							recomputeIfNeededFrame ? i === recomputeIfNeededFrame.vars['this'] :
							tx.updatingObservers.map(o => o.observable).indexOf(i) !== -1
					);
				}
			})			
		}
	});

	// register({
	// 	id: "eventQueue",
	// 	getExtractions(data, collector, context) {
	// 		if (data !== globalThis) {
	// 			return;
	// 		}

	// 		context.addCallFrameRequest({
	// 			methodName: "fire",
	// 			pathRegExp: "event"
	// 		});

	// 		const fireFrame = context.callFrameInfos.find(i => 'methodName' in i && i.methodName === "fire");
	// 		if (!fireFrame || !('methodName' in fireFrame)) {
	// 			return;
	// 		}
			

	// 		collector.addExtraction({
	// 			priority: 1000,
	// 			extractData() {
	// 				let listeners = [];
	// 				/**
	// 				 * @type {any}
	// 				 */
	// 				const event = fireFrame.vars['this'];
	// 				if ('length' in event._listeners) {
	// 					listeners = event._listeners;
	// 				} else {
	// 					listeners = [event._listeners]
	// 				}

	// 				return context.extract(
	// 					JSON.stringify(listeners.length, undefined, 4)
	// 				);
	// 			}
	// 		})			
	// 	}
	// });
};
