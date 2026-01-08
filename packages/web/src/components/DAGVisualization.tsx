import { useEffect, useRef, useState } from "react";
import type { Trace } from "@traceforge/shared";

interface DAGNode {
  id: string;
  stepId: string;
  parentStepId?: string;
  trace: Trace;
  x: number;
  y: number;
  level: number;
}

interface DAGVisualizationProps {
  traces: Trace[];
  currentTraceId?: string;
}

export function DAGVisualization({
  traces,
  currentTraceId,
}: DAGVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<DAGNode[]>([]);
  const [hoveredNode, setHoveredNode] = useState<DAGNode | null>(null);

  useEffect(() => {
    // Build DAG structure from traces
    const tracesWithSteps = traces.filter((t) => t.step_id);
    if (tracesWithSteps.length === 0) return;

    // Find root nodes (no parent_step_id)
    const roots = tracesWithSteps.filter((t) => !t.parent_step_id);
    const nodeMap = new Map<string, DAGNode>();
    const childrenMap = new Map<string, Trace[]>();

    // Build children map
    tracesWithSteps.forEach((trace) => {
      if (trace.parent_step_id) {
        const children = childrenMap.get(trace.parent_step_id) || [];
        children.push(trace);
        childrenMap.set(trace.parent_step_id, children);
      }
    });

    // Layout algorithm: assign levels using BFS
    const queue: { trace: Trace; level: number; parentX?: number }[] =
      roots.map((t) => ({
        trace: t,
        level: 0,
      }));
    const processedSteps = new Set<string>();

    while (queue.length > 0) {
      const { trace, level } = queue.shift()!;
      if (!trace.step_id || processedSteps.has(trace.step_id)) continue;

      processedSteps.add(trace.step_id);

      const children = childrenMap.get(trace.step_id) || [];
      const node: DAGNode = {
        id: trace.id,
        stepId: trace.step_id,
        parentStepId: trace.parent_step_id,
        trace,
        x: 0, // Will be calculated
        y: level * 100 + 50,
        level,
      };

      nodeMap.set(trace.step_id, node);

      // Add children to queue
      children.forEach((child) => {
        queue.push({
          trace: child,
          level: level + 1,
          parentX: node.x,
        });
      });
    }

    // Calculate X positions: distribute nodes at each level
    const levelNodes = new Map<number, DAGNode[]>();
    nodeMap.forEach((node) => {
      const nodesAtLevel = levelNodes.get(node.level) || [];
      nodesAtLevel.push(node);
      levelNodes.set(node.level, nodesAtLevel);
    });

    levelNodes.forEach((nodesAtLevel) => {
      const spacing = 120;
      const totalWidth = (nodesAtLevel.length - 1) * spacing;
      const startX = 300 - totalWidth / 2; // Center around x=300

      nodesAtLevel.forEach((node, idx) => {
        node.x = startX + idx * spacing;
      });
    });

    setNodes(Array.from(nodeMap.values()));
  }, [traces]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw edges
    ctx.strokeStyle = "#4b5563";
    ctx.lineWidth = 2;
    nodes.forEach((node) => {
      if (node.parentStepId) {
        const parent = nodes.find((n) => n.stepId === node.parentStepId);
        if (parent) {
          ctx.beginPath();
          ctx.moveTo(parent.x, parent.y + 20);
          ctx.lineTo(node.x, node.y - 20);
          ctx.stroke();
        }
      }
    });

    // Draw nodes
    nodes.forEach((node) => {
      const isCurrentTrace = node.id === currentTraceId;
      const isHovered = hoveredNode?.id === node.id;

      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, 20, 0, 2 * Math.PI);

      if (isCurrentTrace) {
        ctx.fillStyle = "#3b82f6"; // blue
      } else if (node.trace.metadata.status === "error") {
        ctx.fillStyle = "#ef4444"; // red
      } else {
        ctx.fillStyle = "#10b981"; // green
      }

      if (isHovered) {
        ctx.strokeStyle = "#fbbf24"; // yellow border
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      ctx.fill();

      // Node label (step index)
      ctx.fillStyle = "#ffffff";
      ctx.font = "12px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(node.trace.step_index?.toString() || "?", node.x, node.y);
    });
  }, [nodes, currentTraceId, hoveredNode]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find hovered node
    const hovered = nodes.find((node) => {
      const dx = x - node.x;
      const dy = y - node.y;
      return Math.sqrt(dx * dx + dy * dy) <= 20;
    });

    setHoveredNode(hovered || null);
  };

  const handleMouseLeave = () => {
    setHoveredNode(null);
  };

  if (nodes.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">Session DAG</h2>
        <p className="text-gray-400 text-sm">
          No DAG data available. Use X-TraceForge-Step-ID headers to track
          branching workflows.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold text-white mb-4">Session DAG</h2>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={600}
          height={Math.max(
            400,
            (Math.max(...nodes.map((n) => n.level)) + 1) * 100 + 100
          )}
          className="border border-gray-700 rounded bg-gray-900 cursor-pointer"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />

        {hoveredNode && (
          <div className="absolute top-4 right-4 bg-gray-700 border border-gray-600 rounded p-3 max-w-xs">
            <p className="text-xs text-gray-400">
              Step {hoveredNode.trace.step_index}
            </p>
            <p className="text-sm text-white font-mono truncate">
              {hoveredNode.stepId}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Model: {hoveredNode.trace.metadata.model || "N/A"}
            </p>
            <p className="text-xs text-gray-400">
              Duration: {hoveredNode.trace.metadata.duration_ms}ms
            </p>
            {hoveredNode.trace.organization_id && (
              <p className="text-xs text-gray-400">
                Org: {hoveredNode.trace.organization_id}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-500"></div>
          <span className="text-gray-400">Success</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-red-500"></div>
          <span className="text-gray-400">Error</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-blue-500"></div>
          <span className="text-gray-400">Current</span>
        </div>
      </div>
    </div>
  );
}
