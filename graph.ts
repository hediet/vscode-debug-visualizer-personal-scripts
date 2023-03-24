import { LoadDataExtractorsFn } from "@hediet/debug-visualizer-data-extraction";

const fn: LoadDataExtractorsFn & { Graph: typeof Graph } = function (register, helpers) {
	(helpers as any).Graph = Graph;
};

export = fn;

// ====== GRAPH =========

class Edge<TNode, TEdge> {
	marked = false;

	constructor(public data: TEdge, public readonly from: Node<TNode, TEdge>, public readonly to: Node<TNode, TEdge>) {
	}
}

class Node<TNode, TEdge> {
	ins: Edge<TNode, TEdge>[] = [];
	outs: Edge<TNode, TEdge>[] = [];
	marked = false;

	constructor(public data: TNode) {
	}
}

class Graph<TNode, TEdge> {
	public static create<T, TNode, TEdge>(
		roots: T[],
		getNodeInfo: (item: T) =>  {
            data: TNode;
            edges: ((({ to: T } | { from: T }) & { data: TEdge }) | { include: T } )[];
        }
	): { graph: Graph<TNode, TEdge>, roots: Node<TNode, TEdge>[] } {
		const nodes = new Map<T, Node<TNode, TEdge>>();
		const processed = new Set<T>(roots);
		const queue = Array.from(roots);

		function getNode(node: T): Node<TNode, TEdge> {
			let n = nodes.get(node);
			if (n === undefined) {
				n = new Node(undefined!);
				nodes.set(node, n);
			}
			return n;
		}

		while (queue.length > 0) {
			const item = queue.shift()!;

			const nodeInfo = getNodeInfo(item);
			const node = getNode(item);
            node.data = nodeInfo.data;

			for (const e of nodeInfo.edges) {
				let newNode: T;
				if ("to" in e) {
					const edge = new Edge(e.data, node, getNode(e.to));
					newNode = e.to;
					node.outs.push(edge);
					edge.to.ins.push(edge);
				} else if ("from" in e) {
					const edge = new Edge(e.data, getNode(e.from), node);
					newNode = e.from;
					node.ins.push(edge);
					edge.from.outs.push(edge);
				} else {
					newNode = e.include;
				}
				if (!processed.has(newNode)) {
					processed.add(newNode);
					queue.push(newNode);
				}
			}
		}

        const graph = new Graph(Array.from(nodes.values()));
		return { graph, roots: roots.map((r) => nodes.get(r)!) };
	}

	constructor(public nodes: Node<TNode, TEdge>[]) {}

	markReachableFrom(from: Iterable<Node<TNode, TEdge>>): void {
		const result = new Set<Node<TNode, TEdge>>(from);
		const queue: Node<TNode, TEdge>[] = Array.from(from);
		while (queue.length > 0) {
			const node = queue.shift()!;
			node.marked = true;
			for (const edge of node.outs) {
				edge.marked = true;
				if (!result.has(edge.to)) {
					result.add(node);
					queue.push(edge.to);
				}
			}
		}
	}

	markReachableFromReversed(from: Iterable<Node<TNode, TEdge>>): void {
		const result = new Set<Node<TNode, TEdge>>(from);
		const queue: Node<TNode, TEdge>[] = Array.from(from);
		while (queue.length > 0) {
			const node = queue.shift()!;
			node.marked = true;
			for (const edge of node.ins) {
				edge.marked = true;
				if (!result.has(edge.from)) {
					result.add(node);
					queue.push(edge.from);
				}
			}
		}
	}

	restrictToMarked(): void {
		this.nodes = this.nodes.filter((n) => n.marked);
		for (const node of this.nodes) {
			node.ins = node.ins.filter((e) => e.marked);
			node.outs = node.outs.filter((e) => e.marked);
		}
	}
}

fn.Graph = Graph;
