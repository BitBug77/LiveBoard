"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Whiteboard from "@/components/whiteboard"
import { Loader2 } from "lucide-react"

export default function BoardPage() {
  const params = useParams()
  const roomCode = params.roomCode as string
  const [loading, setLoading] = useState(true)
  const [boardData, setBoardData] = useState(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchBoardData() {
      try {
        const response = await fetch(`http://127.0.0.1:5000/api/board/${roomCode}`)

        if (!response.ok) {
          throw new Error(`Failed to fetch board data: ${response.statusText}`)
        }

        const data = await response.json()

        if (data.success) {
          setBoardData(data.data)
        } else {
          throw new Error(data.message || "Failed to fetch board data")
        }
      } catch (err) {
        console.error("Error fetching board data:", err)
        setError(err.message || "Failed to load board data")
      } finally {
        setLoading(false)
      }
    }

    if (roomCode) {
      fetchBoardData()
    }
  }, [roomCode])

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2">Loading board...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-500">Error</h2>
          <p className="mt-2">{error}</p>
        </div>
      </div>
    )
  }

  return <Whiteboard initialBoardData={boardData} roomCode={roomCode} />
}
