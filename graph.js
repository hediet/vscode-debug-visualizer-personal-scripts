"use strict";
const fn = function (register, helpers) {
    helpers.Graph = Graph;
};
// ====== GRAPH =========
class Edge {
    constructor(data, from, to) {
        this.data = data;
        this.from = from;
        this.to = to;
        this.marked = false;
    }
}
class Node {
    constructor(data) {
        this.data = data;
        this.ins = [];
        this.outs = [];
        this.marked = false;
    }
}
class Graph {
    constructor(nodes) {
        this.nodes = nodes;
    }
    static create(roots, getNodeInfo) {
        const nodes = new Map();
        const processed = new Set(roots);
        const queue = Array.from(roots);
        function getNode(node) {
            let n = nodes.get(node);
            if (n === undefined) {
                n = new Node(undefined);
                nodes.set(node, n);
            }
            return n;
        }
        while (queue.length > 0) {
            const item = queue.shift();
            const nodeInfo = getNodeInfo(item);
            const node = getNode(item);
            node.data = nodeInfo.data;
            for (const e of nodeInfo.edges) {
                let newNode;
                if ("to" in e) {
                    const edge = new Edge(e.data, node, getNode(e.to));
                    newNode = e.to;
                    node.outs.push(edge);
                    edge.to.ins.push(edge);
                }
                else if ("from" in e) {
                    const edge = new Edge(e.data, getNode(e.from), node);
                    newNode = e.from;
                    node.ins.push(edge);
                    edge.from.outs.push(edge);
                }
                else {
                    newNode = e.include;
                }
                if (!processed.has(newNode)) {
                    processed.add(newNode);
                    queue.push(newNode);
                }
            }
        }
        const graph = new Graph(Array.from(nodes.values()));
        return { graph, roots: roots.map((r) => nodes.get(r)) };
    }
    markReachableFrom(from) {
        const result = new Set(from);
        const queue = Array.from(from);
        while (queue.length > 0) {
            const node = queue.shift();
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
    markReachableFromReversed(from) {
        const result = new Set(from);
        const queue = Array.from(from);
        while (queue.length > 0) {
            const node = queue.shift();
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
    restrictToMarked() {
        this.nodes = this.nodes.filter((n) => n.marked);
        for (const node of this.nodes) {
            node.ins = node.ins.filter((e) => e.marked);
            node.outs = node.outs.filter((e) => e.marked);
        }
    }
}
fn.Graph = Graph;
module.exports = fn;
