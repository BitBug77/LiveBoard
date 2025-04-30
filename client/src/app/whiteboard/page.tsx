"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import {
  Pencil,
  Square,
  Type,
  Users,
  Circle,
  MousePointer,
  ChevronDown,
  Download,
  ZoomIn,
  ZoomOut,
  Undo,
  Redo,
  MessageCircle,
  MoreVertical,
} from "lucide-react"

type Tool = "select" | "pen" | "square" | "circle" | "text"
type DrawingElement = {
  type: Tool
  points?: { x: number; y: number }[]
  startX?: number
  startY?: number
  endX?: number
  endY?: number
  text?: string
  color: string
}

export default function Whiteboard() {
  const [tool, setTool] = useState<Tool>("select")
  const [color, setColor] = useState("#000000")
  const [isDrawing, setIsDrawing] = useState(false)
  const [elements, setElements] = useState<DrawingElement[]>([])
  const [currentElement, setCurrentElement] = useState<DrawingElement | null>(null)
  const [zoom, setZoom] = useState(100)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [title, setTitle] = useState("Customer Journey Map")

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / (zoom / 100)
    const y = (e.clientY - rect.top) / (zoom / 100)

    setIsDrawing(true)

    if (tool === "pen") {
      const newElement: DrawingElement = {
        type: "pen",
        points: [{ x, y }],
        color,
      }
      setCurrentElement(newElement)
    } else if (tool === "square" || tool === "circle") {
      const newElement: DrawingElement = {
        type: tool,
        startX: x,
        startY: y,
        endX: x,
        endY: y,
        color,
      }
      setCurrentElement(newElement)
    } else if (tool === "text") {
      const text = prompt("Enter text:")
      if (text) {
        const newElement: DrawingElement = {
          type: "text",
          startX: x,
          startY: y,
          text,
          color,
        }
        setElements([...elements, newElement])
      }
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !canvasRef.current || !currentElement) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / (zoom / 100)
    const y = (e.clientY - rect.top) / (zoom / 100)

    if (tool === "pen") {
      setCurrentElement({
        ...currentElement,
        points: [...(currentElement.points || []), { x, y }],
      })
    } else if (tool === "square" || tool === "circle") {
      setCurrentElement({
        ...currentElement,
        endX: x,
        endY: y,
      })
    }
  }

  const handleMouseUp = () => {
    if (isDrawing && currentElement) {
      setElements([...elements, currentElement])
      setCurrentElement(null)
    }
    setIsDrawing(false)
  }

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 25, 200))
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 25, 25))
  }

  const handleUndo = () => {
    if (elements.length > 0) {
      setElements(elements.slice(0, -1))
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+Z or Command+Z
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault()
        handleUndo()
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [elements])

  return (
    <div className="h-full w-full overflow-hidden">
      {/* Canvas with grid covering entire page */}
      <div className="absolute inset-0 bg-gray-100">
        <div
          ref={canvasRef}
          className="absolute inset-0 w-full h-full bg-gray-100"
          style={{
            backgroundImage:
              "linear-gradient(#bbb 1px, transparent 1px), linear-gradient(90deg, #bbb 1px, transparent 1px)",
            backgroundSize: `${40 * (zoom / 100)}px ${40 * (zoom / 100)}px`,
            transform: `scale(${zoom / 100})`,
            transformOrigin: "0 0",
            minWidth: `${100 / (zoom / 100)}%`,
            minHeight: `${100 / (zoom / 100)}%`,
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Render existing elements */}
          {elements.map((element, index) => {
            if (element.type === "pen" && element.points) {
              const pathData = element.points.reduce((path, point, i) => {
                return path + (i === 0 ? `M ${point.x} ${point.y}` : ` L ${point.x} ${point.y}`)
              }, "")

              return (
                <svg key={index} className="absolute top-0 left-0 w-full h-full pointer-events-none">
                  <path d={pathData} stroke={element.color} strokeWidth="2" fill="none" />
                </svg>
              )
            } else if (
              element.type === "square" &&
              element.startX !== undefined &&
              element.startY !== undefined &&
              element.endX !== undefined &&
              element.endY !== undefined
            ) {
              const x = Math.min(element.startX, element.endX)
              const y = Math.min(element.startY, element.endY)
              const width = Math.abs(element.endX - element.startX)
              const height = Math.abs(element.endY - element.startY)

              return (
                <div
                  key={index}
                  className="absolute border-2 border-solid"
                  style={{
                    left: `${x}px`,
                    top: `${y}px`,
                    width: `${width}px`,
                    height: `${height}px`,
                    borderColor: element.color,
                  }}
                />
              )
            } else if (
              element.type === "circle" &&
              element.startX !== undefined &&
              element.startY !== undefined &&
              element.endX !== undefined &&
              element.endY !== undefined
            ) {
              const x = Math.min(element.startX, element.endX)
              const y = Math.min(element.startY, element.endY)
              const width = Math.abs(element.endX - element.startX)
              const height = Math.abs(element.endY - element.startY)

              return (
                <div
                  key={index}
                  className="absolute border-2 border-solid rounded-full"
                  style={{
                    left: `${x}px`,
                    top: `${y}px`,
                    width: `${width}px`,
                    height: `${height}px`,
                    borderColor: element.color,
                  }}
                />
              )
            } else if (
              element.type === "text" &&
              element.startX !== undefined &&
              element.startY !== undefined &&
              element.text
            ) {
              return (
                <div
                  key={index}
                  className="absolute"
                  style={{
                    left: `${element.startX}px`,
                    top: `${element.startY}px`,
                    color: element.color,
                  }}
                >
                  {element.text}
                </div>
              )
            }
            return null
          })}

          {/* Render current element while drawing */}
          {currentElement && currentElement.type === "pen" && currentElement.points && (
            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
              <path
                d={currentElement.points.reduce((path, point, i) => {
                  return path + (i === 0 ? `M ${point.x} ${point.y}` : ` L ${point.x} ${point.y}`)
                }, "")}
                stroke={currentElement.color}
                strokeWidth="2"
                fill="none"
              />
            </svg>
          )}

          {currentElement &&
            currentElement.type === "square" &&
            currentElement.startX !== undefined &&
            currentElement.startY !== undefined &&
            currentElement.endX !== undefined &&
            currentElement.endY !== undefined && (
              <div
                className="absolute border-2 border-solid"
                style={{
                  left: `${Math.min(currentElement.startX, currentElement.endX)}px`,
                  top: `${Math.min(currentElement.startY, currentElement.endY)}px`,
                  width: `${Math.abs(currentElement.endX - currentElement.startX)}px`,
                  height: `${Math.abs(currentElement.endY - currentElement.startY)}px`,
                  borderColor: currentElement.color,
                }}
              />
            )}

          {currentElement &&
            currentElement.type === "circle" &&
            currentElement.startX !== undefined &&
            currentElement.startY !== undefined &&
            currentElement.endX !== undefined &&
            currentElement.endY !== undefined && (
              <div
                className="absolute border-2 border-solid rounded-full"
                style={{
                  left: `${Math.min(currentElement.startX, currentElement.endX)}px`,
                  top: `${Math.min(currentElement.startY, currentElement.endY)}px`,
                  width: `${Math.abs(currentElement.endX - currentElement.startX)}px`,
                  height: `${Math.abs(currentElement.endY - currentElement.startY)}px`,
                  borderColor: currentElement.color,
                }}
              />
            )}
        </div>

        {/* Navbar - Left side */}
        <div className="absolute top-4 left-4 flex items-center gap-3 bg-white rounded-md shadow-md p-2 z-20">
          <h1 className="font-bold text-xl">LiveBoard</h1>
          <button className="p-1 rounded-md hover:bg-gray-100">
            <MoreVertical className="w-4 h-4" />
          </button>
          <button className="px-3 py-1 text-sm border rounded hover:bg-gray-50 ml-2">Upgrade</button>
        </div>

        {/* Navbar - Right side */}
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-white rounded-md shadow-md p-2 z-20">
          <button className="p-1 rounded-md hover:bg-gray-100">
            <Download className="w-4 h-4" />
          </button>
          <button className="p-1 rounded-md hover:bg-gray-100">
            <MessageCircle className="w-4 h-4" />
          </button>
          <button className="px-3 py-1 text-sm border rounded hover:bg-gray-50">Present</button>
          <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Share</button>
        </div>

        {/* Toolbar */}
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 flex items-center gap-1 bg-white rounded-md shadow-md p-1 z-10">
          <button
            className={`p-1 rounded-md ${tool === "select" ? "bg-blue-100" : "hover:bg-gray-100"}`}
            onClick={() => setTool("select")}
            title="Select"
          >
            <MousePointer className="w-4 h-4" />
          </button>
          <button
            className={`p-1 rounded-md ${tool === "pen" ? "bg-blue-100" : "hover:bg-gray-100"}`}
            onClick={() => setTool("pen")}
            title="Pen"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            className={`p-1 rounded-md ${tool === "square" ? "bg-blue-100" : "hover:bg-gray-100"}`}
            onClick={() => setTool("square")}
            title="Square"
          >
            <Square className="w-4 h-4" />
          </button>
          <button
            className={`p-1 rounded-md ${tool === "circle" ? "bg-blue-100" : "hover:bg-gray-100"}`}
            onClick={() => setTool("circle")}
            title="Circle"
          >
            <Circle className="w-4 h-4" />
          </button>
          <button
            className={`p-1 rounded-md ${tool === "text" ? "bg-blue-100" : "hover:bg-gray-100"}`}
            onClick={() => setTool("text")}
            title="Text"
          >
            <Type className="w-4 h-4" />
          </button>
          <button className="p-1 rounded-md hover:bg-gray-100" title="Users">
            <Users className="w-4 h-4" />
          </button>
          <button className="p-1 rounded-md hover:bg-gray-100" title="Comments">
            <MessageCircle className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom controls */}
        <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-white rounded-md shadow p-1">
          <button className="p-1 hover:bg-gray-100 rounded" onClick={handleZoomOut}>
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="text-sm">{zoom}%</span>
          <button className="p-1 hover:bg-gray-100 rounded" onClick={handleZoomIn}>
            <ZoomIn className="w-5 h-5" />
          </button>
        </div>

        {/* Color picker */}
        <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-white rounded-md shadow p-2">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-6 h-6 border-0 p-0 m-0"
          />
          <div className="flex gap-1">
            {["#000000", "#FF0000", "#00FF00", "#0000FF", "#FFFF00"].map((colorOption) => (
              <button
                key={colorOption}
                className="w-5 h-5 rounded-full border border-gray-300"
                style={{ backgroundColor: colorOption }}
                onClick={() => setColor(colorOption)}
              />
            ))}
          </div>
        </div>

        {/* Undo/Redo */}
        <div className="absolute top-20 left-4 flex items-center gap-2 bg-white rounded-md shadow p-1">
          <button className="p-1 hover:bg-gray-100 rounded" onClick={handleUndo} disabled={elements.length === 0}>
            <Undo className={`w-5 h-5 ${elements.length === 0 ? "text-gray-300" : ""}`} />
          </button>
          <button className="p-1 hover:bg-gray-100 rounded opacity-50" disabled={true}>
            <Redo className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
