// @ts-check

/**
 * @type {import("@hediet/debug-visualizer-data-extraction").LoadDataExtractorsFn}
 */
module.exports = (register, helpers) => {
	/**
	 * @type {(value: any) => value is import("C:/dev/microsoft/vscode/src/vs/base/common/observableImpl/base").ObservableValue}
	 */
	function isObservableValue(value) {
		return value.constructor.name === "ObservableValue";
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
		return "" + value;
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
	 * @param {unknown} data 
	 * @param {'all' | 'related'} mode 
	 */
	function getData(data, mode) {
		const { graph, roots } = helpers2.Graph.create([data], i => {
			const isFocused = i === data;
			if (isObservableValue(i)) {
				return {
					data: {
						label: i.debugName + " (" + formatValue(i["value"]) + ")",
						isFocused
					},
					edges: [...getObservers(i)].map((o) => ({
						to: o,
						data: undefined,
					})),
				};
			} else if (isDerived(i)) {
				return {
					data: {
						label: `${i.debugName} (${formatValue(i["value"])}) - ${i['updateCount']}`,
						isFocused
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
				return {
					data: {
						label: `${i.debugName} - ${i['updateCount']}`,
						isFocused
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
				edges: i.outs.map(o => ({ to: o.to })),
				shape: "box",
				color: i.data.isFocused ? "lime" : undefined,
			}
		}, { maxSize: 100 });
	}

	register({
		id: "map",
		getExtractions(data, collector, context) {
			if (!data || ![isObservableValue, isDerived, isAutorunObserver].some((f) => f(data))) {
				return;
			}

			collector.addExtraction({
				priority: 1000,
				id: "observables all",
				name: "Observable (All)",
				extractData() {
					return getData(data, 'all');
				},
			});

			collector.addExtraction({
				priority: 1001,
				id: "observables related",
				name: "Observable (Related)",
				extractData() {
					return getData(data, 'related');
				},
			});
		},
	});
};
