"use client"

import type React from "react"

import { io } from "socket.io-client"
import { useState, useRef, useEffect } from "react"
import {
  Pencil,
  Square,
  Type,
  Users,
  Circle,
  MousePointer,
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
  id?: string
  points?: { x: number; y: number }[]
  startX?: number
  startY?: number
  endX?: number
  endY?: number
  text?: string
  color: string
  thickness?: number
  _id?: string
  timestamp?: string
}

type BoardData = {
  drawings: DrawingElement[]
  texts: any[]
  lastUpdated: string
}

interface WhiteboardProps {
  initialBoardData: BoardData | null
  roomCode: string
}

// Create socket outside component to avoid recreation on renders
const socket = io("http://localhost:5000", {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  transports: ["websocket"],
  forceNew: false,
  autoConnect: true,
})

export default function Whiteboard({ initialBoardData, roomCode }: WhiteboardProps) {
  const [tool, setTool] = useState<Tool>("select")
  const [color, setColor] = useState("#000000")
  const [isDrawing, setIsDrawing] = useState(false)
  const [elements, setElements] = useState<DrawingElement[]>([])
  const [currentElement, setCurrentElement] = useState<DrawingElement | null>(null)
  const [zoom, setZoom] = useState(100)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [title, setTitle] = useState("Whiteboard")
  const [joinLink, setJoinLink] = useState("")
  const [sessionId, setSessionId] = useState("")
  const [userId, setUserId] = useState("")
  const [socketConnected, setSocketConnected] = useState(false)
  const lineWidth = 3

  // Initialize board with data from API
  useEffect(() => {
    if (initialBoardData) {
      const processedElements: DrawingElement[] = []

      // Process drawings
      if (initialBoardData.drawings && Array.isArray(initialBoardData.drawings)) {
        initialBoardData.drawings.forEach((drawing) => {
          processedElements.push({
            ...drawing,
            type: (drawing.type as Tool) || "pen",
            color: drawing.color || "#000000",
          })
        })
      }

      // Process texts if they exist
      if (initialBoardData.texts && Array.isArray(initialBoardData.texts)) {
        initialBoardData.texts.forEach((text) => {
          processedElements.push({
            id: text._id,
            type: "text",
            startX: text.startX || text.x,
            startY: text.startY || text.y,
            text: text.content || text.text,
            color: text.color || "#000000",
          })
        })
      }

      setElements(processedElements)
    }
  }, [initialBoardData])

  // Set up socket connection
  useEffect(() => {
    // Make sure socket is connected when component mounts
    if (!socket.connected) {
      socket.connect()
    }

    function onConnect() {
      console.log("Connected to socket server")
      setSocketConnected(true)

      // Join the room when connected
      if (roomCode) {
        const tempUserId = userId || `user-${Date.now()}`
        setUserId(tempUserId)

        socket.emit("join_room", {
          sessionId: roomCode,
          userId: tempUserId,
        })
        console.log(`Joined room ${roomCode} as ${tempUserId}`)
      }
    }

    function onDisconnect() {
      console.log("Disconnected from socket server")
      setSocketConnected(false)
    }

    function onConnectError(error: any) {
      console.error("Socket connection error:", error)
      setSocketConnected(false)
    }

    // Add event listeners
    socket.on("connect", onConnect)
    socket.on("disconnect", onDisconnect)
    socket.on("connect_error", onConnectError)

    // Set initial connection state
    setSocketConnected(socket.connected)

    // Set session ID from room code
    setSessionId(roomCode)
    setJoinLink(`http://localhost:3000/board/${roomCode}`)

    // If already connected, join the room
    if (socket.connected && roomCode) {
      const tempUserId = `user-${Date.now()}`
      setUserId(tempUserId)

      socket.emit("join_room", {
        sessionId: roomCode,
        userId: tempUserId,
      })
      console.log(`Joined room ${roomCode} as ${tempUserId}`)
    }

    return () => {
      socket.off("connect", onConnect)
      socket.off("disconnect", onDisconnect)
      socket.off("connect_error", onConnectError)

      // Leave room when component unmounts
      if (roomCode && userId && socket.connected) {
        socket.emit("leave_room", {
          sessionId: roomCode,
          userId,
        })
      }
    }
  }, [roomCode])

  // Handle socket events for real-time updates
  useEffect(() => {
    // Listen for board state updates from server
    function handleBoardState(boardState: any) {
      console.log("Received board state:", boardState)

      // Process and set elements from board state
      const newElements: DrawingElement[] = []

      // Process drawings
      if (boardState.drawings && Array.isArray(boardState.drawings)) {
        boardState.drawings.forEach((drawing: any) => {
          newElements.push({
            ...drawing,
            type: (drawing.type as Tool) || "pen",
            color: drawing.color || "#000000",
          })
        })
      }

      // Process text elements
      if (boardState.texts && Array.isArray(boardState.texts)) {
        boardState.texts.forEach((textData: any) => {
          newElements.push({
            id: textData.id || textData._id,
            type: "text",
            startX: textData.x || textData.startX,
            startY: textData.y || textData.startY,
            text: textData.content || textData.text,
            color: textData.color || "#000000",
          })
        })
      }

      setElements(newElements)
    }

    // Listen for new drawings from other users
    function handleDraw(drawData: any) {
      console.log("Received draw event:", drawData)
      setElements((prev) => [
        ...prev,
        {
          ...drawData,
          type: (drawData.type as Tool) || "pen",
          color: drawData.color || "#000000",
        },
      ])
    }

    // Listen for text updates from other users
    function handleText(textData: any) {
      console.log("Received text event:", textData)
      setElements((prev) => [
        ...prev,
        {
          id: textData.id,
          type: "text",
          startX: textData.x,
          startY: textData.y,
          text: textData.content,
          color: textData.color || "#000000",
        },
      ])
    }

    // Listen for errors
    function handleError(error: any) {
      console.error("Socket error:", error)
      alert(`Error: ${error.message}`)
    }

    // Listen for user joined events
    function handleUserJoined(data: { userId: string }) {
      console.log(`User ${data.userId} joined the session`)
      // You could show a notification or update UI here
    }

    // Add event listeners
    socket.on("board_state", handleBoardState)
    socket.on("draw", handleDraw)
    socket.on("text", handleText)
    socket.on("error", handleError)
    socket.on("user_joined", handleUserJoined)

    return () => {
      // Clean up socket listeners
      socket.off("board_state", handleBoardState)
      socket.off("draw", handleDraw)
      socket.off("text", handleText)
      socket.off("error", handleError)
      socket.off("user_joined", handleUserJoined)
    }
  }, [])

  // Track cursor position and emit to others - using debounce to reduce network traffic
  const cursorMoveTimeoutRef = useRef<number | null>(null)

  const handleCursorMove = (e: React.MouseEvent) => {
    if (!canvasRef.current || !sessionId || !userId) return

    // Clear previous timeout
    if (cursorMoveTimeoutRef.current) {
      window.clearTimeout(cursorMoveTimeoutRef.current)
    }

    // Set new timeout for debounce (60ms for smooth cursor movement)
    cursorMoveTimeoutRef.current = window.setTimeout(() => {
      if (!socket.connected) {
        console.warn("Socket not connected, cursor position not sent")
        return
      }

      const rect = canvasRef.current!.getBoundingClientRect()
      const x = (e.clientX - rect.left) / (zoom / 100)
      const y = (e.clientY - rect.top) / (zoom / 100)

      socket.emit("cursor", {
        sessionId,
        cursorData: {
          userId,
          x,
          y,
        },
      })
    }, 60)
  }

  // Handle mouse down for drawing
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
        thickness: lineWidth,
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
        const textId = `text-${Date.now()}`
        const newElement: DrawingElement = {
          id: textId,
          type: "text",
          startX: x,
          startY: y,
          text,
          color,
        }

        // Add to local state
        setElements([...elements, newElement])

        // Check socket connection before emitting
        if (!socket.connected) {
          console.warn("Socket not connected, text not sent to server")
          return
        }

        // Emit text event to server
        if (sessionId) {
          console.log("Emitting text event:", {
            sessionId,
            textData: {
              id: textId,
              content: text,
              x: newElement.startX,
              y: newElement.startY,
              color: newElement.color,
            },
          })

          socket.emit("text", {
            sessionId,
            textData: {
              id: textId,
              content: text,
              x: newElement.startX,
              y: newElement.startY,
              color: newElement.color,
            },
          })
        } else {
          console.warn("Not emitting text event - no session ID")
        }
      }
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    // Handle cursor tracking for all users
    handleCursorMove(e)

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
      // Add the current element to local state
      setElements([...elements, currentElement])

      // Check socket connection before emitting
      if (!socket.connected) {
        console.warn("Socket not connected, drawing not sent to server")
        setIsDrawing(false)
        setCurrentElement(null)
        return
      }

      // Emit draw event to socket server
      if (sessionId) {
        console.log("Emitting draw event to server:", {
          sessionId,
          drawData: currentElement,
        })

        if (currentElement.type === "pen") {
          socket.emit("draw", {
            sessionId,
            drawData: {
              type: currentElement.type,
              points: currentElement.points,
              color: currentElement.color,
              thickness: lineWidth,
            },
          })
        } else if (currentElement.type === "square" || currentElement.type === "circle") {
          socket.emit("draw", {
            sessionId,
            drawData: {
              type: currentElement.type,
              startX: currentElement.startX,
              startY: currentElement.startY,
              endX: currentElement.endX,
              endY: currentElement.endY,
              color: currentElement.color,
              thickness: lineWidth,
            },
          })
        }
      } else {
        console.warn("Not emitting draw event - no session ID")
      }

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
    // Check socket connection before emitting
    if (socket.connected && sessionId && userId) {
      // Send undo request to server
      socket.emit("undo", {
        sessionId,
        userId,
      })
    } else if (elements.length > 0) {
      // Local fallback if not connected
      setElements(elements.slice(0, -1))
    }
  }

  const handleRedo = () => {
    // Check socket connection before emitting
    if (socket.connected && sessionId && userId) {
      // Send redo request to server
      socket.emit("redo", {
        sessionId,
        userId,
      })
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+Z or Command+Z
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault()
        handleUndo()
      }

      // Check for Ctrl+Y or Command+Y
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault()
        handleRedo()
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [elements, sessionId, userId])

  // Attempt to reconnect socket if needed
  const attemptReconnect = () => {
    console.log("Attempting to reconnect socket...")
    if (!socket.connected) {
      socket.connect()
    }
  }

  const handleShareClick = () => {
    if (joinLink) {
      navigator.clipboard.writeText(joinLink)
      alert("Join link copied to clipboard!")
    } else {
      alert("Join link not available yet. Please try again in a moment.")
    }
  }

  const handleDownloadClick = () => {
    // Example implementation for downloading the canvas as an image
    alert("Download functionality coming soon!")
  }

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
                  <path d={pathData} stroke={element.color} strokeWidth={element.thickness || 2} fill="none" />
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
                    borderWidth: element.thickness || 2,
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
                    borderWidth: element.thickness || 2,
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
                strokeWidth={lineWidth}
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
          <button className="p-1 rounded-md hover:bg-gray-100" onClick={handleDownloadClick}>
            <Download className="w-4 h-4" />
          </button>
          <button className="p-1 rounded-md hover:bg-gray-100">
            <MessageCircle className="w-4 h-4" />
          </button>
          <button className="px-3 py-1 text-sm border rounded hover:bg-gray-50">Present</button>
          <button
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={handleShareClick}
          >
            Share
          </button>
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
          <button className="p-1 hover:bg-gray-100 rounded" onClick={handleUndo}>
            <Undo className={`w-5 h-5 ${elements.length === 0 ? "text-gray-300" : ""}`} />
          </button>
          <button className="p-1 hover:bg-gray-100 rounded" onClick={handleRedo}>
            <Redo className="w-5 h-5" />
          </button>
        </div>

        {/* Connection status indicator with reconnect button */}
        <div className="absolute bottom-20 left-4 bg-white px-2 py-1 rounded-md shadow text-sm flex items-center gap-2">
          {socketConnected ? (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span> Connected
            </span>
          ) : (
            <>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500"></span> Disconnected
              </span>
              <button
                className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                onClick={attemptReconnect}
              >
                Reconnect
              </button>
            </>
          )}
        </div>

        {/* Room code info */}
        <div className="absolute bottom-28 left-4 bg-white px-2 py-1 rounded-md shadow text-xs">
          Room Code: {roomCode || "None"}
        </div>
      </div>
    </div>
  )
}
