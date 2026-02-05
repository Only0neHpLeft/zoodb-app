import React, { useState, useCallback, useMemo } from "react"
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ConnectionLineType,
  Panel,
} from "reactflow"
import "reactflow/dist/style.css"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, PawPrint, Network, AlertCircle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Animal = {
  id: number
  type: number
  name: string
  weight: number
  born: string
  consumption: number | null
}

type AnimalType = {
  id: number
  title: string
  weight_min: number
  weight_max: number
}

type Caretaker = {
  id: number
  name: string
  born: string
}

type Assignment = {
  caretaker: number
  animal: number
}

type NetworkGraphProps = {
  animals: Animal[]
  types: AnimalType[]
  caretakers: Caretaker[]
  assignments: Assignment[]
}

const ANIMAL_TYPE_COLORS: { [key: string]: string } = {
  default: "#3b82f6", // blue
  1: "#ef4444", // red
  2: "#10b981", // green
  3: "#f59e0b", // amber
  4: "#8b5cf6", // violet
  5: "#ec4899", // pink
  6: "#06b6d4", // cyan
  7: "#84cc16", // lime
}

export function NetworkGraph({ animals, types, caretakers, assignments }: NetworkGraphProps) {
  const [, setSelectedNode] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<string>("all")

  const getTypeColor = (typeId: number): string => {
    return ANIMAL_TYPE_COLORS[typeId] || ANIMAL_TYPE_COLORS.default
  }

  // Calculate average animals per caretaker for identifying overworked ones
  const avgAnimalsPerCaretaker = assignments.length / caretakers.length

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const getTypeName = (typeId: number): string => {
      const type = types.find(t => t.id === typeId)
      return type ? type.title : 'Unknown'
    }
    const nodes: Node[] = []
    const edges: Edge[] = []

    // Filter animals by type if needed
    const filteredAnimals = typeFilter === "all"
      ? animals
      : animals.filter(a => a.type.toString() === typeFilter)

    // Get relevant assignments for filtered animals
    const relevantAssignments = typeFilter === "all"
      ? assignments
      : assignments.filter(a => filteredAnimals.some(animal => animal.id === a.animal))

    // Get relevant caretakers (those who have assignments with filtered animals)
    const relevantCaretakerIds = new Set(relevantAssignments.map(a => a.caretaker))
    const relevantCaretakers = caretakers.filter(c => relevantCaretakerIds.has(c.id))

    // Create caretaker nodes in a circle on the left
    const caretakerRadius = Math.max(200, relevantCaretakers.length * 30)
    relevantCaretakers.forEach((caretaker, index) => {
      const angle = (index / relevantCaretakers.length) * 2 * Math.PI
      const x = 300 + caretakerRadius * Math.cos(angle)
      const y = 400 + caretakerRadius * Math.sin(angle)

      const animalCount = relevantAssignments.filter(a => a.caretaker === caretaker.id).length
      const isOverworked = animalCount > avgAnimalsPerCaretaker * 1.5

      nodes.push({
        id: `caretaker-${caretaker.id}`,
        type: 'default',
        position: { x, y },
        data: {
          label: (
            <div className="text-center">
              <div className="font-semibold text-sm">{caretaker.name}</div>
              <div className="text-xs text-muted-foreground">{animalCount} animals</div>
              {isOverworked && (
                <div className="text-xs text-red-600 font-medium">Overworked!</div>
              )}
            </div>
          )
        },
        style: {
          background: isOverworked ? '#fee2e2' : '#dbeafe',
          border: isOverworked ? '2px solid #ef4444' : '2px solid #3b82f6',
          borderRadius: '50%',
          width: 120,
          height: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 10,
        },
      })
    })

    // Create animal nodes in a circle on the right
    const animalRadius = Math.max(200, filteredAnimals.length * 20)
    filteredAnimals.forEach((animal, index) => {
      const angle = (index / filteredAnimals.length) * 2 * Math.PI
      const x = 800 + animalRadius * Math.cos(angle)
      const y = 400 + animalRadius * Math.sin(angle)

      const typeColor = getTypeColor(animal.type)

      nodes.push({
        id: `animal-${animal.id}`,
        type: 'default',
        position: { x, y },
        data: {
          label: (
            <div className="text-center">
              <div className="font-semibold text-xs">{animal.name}</div>
              <div className="text-xs opacity-70">{getTypeName(animal.type)}</div>
            </div>
          )
        },
        style: {
          background: typeColor + '20',
          border: `2px solid ${typeColor}`,
          borderRadius: 8,
          padding: '8px 12px',
          fontSize: 11,
        },
      })
    })

    // Create edges for assignments
    relevantAssignments.forEach((assignment) => {
      const animal = filteredAnimals.find(a => a.id === assignment.animal)
      if (animal) {
        edges.push({
          id: `edge-${assignment.caretaker}-${assignment.animal}`,
          source: `caretaker-${assignment.caretaker}`,
          target: `animal-${assignment.animal}`,
          type: ConnectionLineType.Bezier,
          animated: false,
          style: {
            stroke: getTypeColor(animal.type),
            strokeWidth: 2,
          },
        })
      }
    })

    return { nodes, edges }
  }, [animals, caretakers, assignments, types, typeFilter, avgAnimalsPerCaretaker])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Update nodes and edges when filter changes
  React.useEffect(() => {
    setNodes(initialNodes)
    setEdges(initialEdges)
  }, [initialNodes, initialEdges, setNodes, setEdges])

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id)

    // Highlight connected edges
    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.source === node.id || edge.target === node.id) {
          return {
            ...edge,
            animated: true,
            style: {
              ...edge.style,
              strokeWidth: 4,
            },
          }
        }
        return {
          ...edge,
          animated: false,
          style: {
            ...edge.style,
            strokeWidth: 2,
            opacity: 0.3,
          },
        }
      })
    )

    // Highlight connected nodes
    const connectedNodeIds = new Set<string>()
    edges.forEach((edge) => {
      if (edge.source === node.id) connectedNodeIds.add(edge.target)
      if (edge.target === node.id) connectedNodeIds.add(edge.source)
    })

    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === node.id || connectedNodeIds.has(n.id)) {
          return {
            ...n,
            style: {
              ...n.style,
              opacity: 1,
            },
          }
        }
        return {
          ...n,
          style: {
            ...n.style,
            opacity: 0.3,
          },
        }
      })
    )
  }, [edges, setEdges, setNodes])

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
    setEdges((eds) =>
      eds.map((edge) => ({
        ...edge,
        animated: false,
        style: {
          ...edge.style,
          strokeWidth: 2,
          opacity: 1,
        },
      }))
    )
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        style: {
          ...node.style,
          opacity: 1,
        },
      }))
    )
  }, [setEdges, setNodes])

  const overworkedCaretakers = caretakers.filter((caretaker) => {
    const count = assignments.filter(a => a.caretaker === caretaker.id).length
    return count > avgAnimalsPerCaretaker * 1.5
  })

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Network className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle>Caretaker-Animal Network</CardTitle>
              <CardDescription>
                Interactive relationship visualization
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {overworkedCaretakers.length > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                {overworkedCaretakers.length} Overworked
              </Badge>
            )}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {types.map((type) => (
                  <SelectItem key={type.id} value={type.id.toString()}>
                    {type.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[600px] border rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            connectionLineType={ConnectionLineType.Bezier}
            fitView
            minZoom={0.2}
            maxZoom={2}
          >
            <Background />
            <Controls />
            <MiniMap
              nodeColor={(node) => {
                if (node.id.startsWith('caretaker-')) return '#3b82f6'
                return '#10b981'
              }}
              maskColor="rgb(240, 240, 240, 0.6)"
            />
            <Panel position="top-left" className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border">
              <div className="flex gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-200 border-2 border-blue-600"></div>
                  <span>Caretakers</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-200 border-2 border-green-600"></div>
                  <span>Animals</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-red-100 border-2 border-red-600"></div>
                  <span>Overworked</span>
                </div>
              </div>
            </Panel>
          </ReactFlow>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <Users className="h-5 w-5 mx-auto mb-1 text-blue-600" />
            <div className="text-2xl font-bold">{caretakers.length}</div>
            <div className="text-xs text-muted-foreground">Total Caretakers</div>
          </div>
          <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
            <PawPrint className="h-5 w-5 mx-auto mb-1 text-green-600" />
            <div className="text-2xl font-bold">{animals.length}</div>
            <div className="text-xs text-muted-foreground">Total Animals</div>
          </div>
          <div className="text-center p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
            <Network className="h-5 w-5 mx-auto mb-1 text-purple-600" />
            <div className="text-2xl font-bold">{assignments.length}</div>
            <div className="text-xs text-muted-foreground">Total Connections</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
