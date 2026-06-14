import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { Socket } from 'socket.io-client'
import type { Message } from '../types'
import { connectSocket, disconnectSocket } from '../utils/socket'
import { getStoredToken } from '../store/authStore'

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
  sendMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void
  disconnect: () => void
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  sendMessage: () => {},
  disconnect: () => {},
})

export const useSocket = () => useContext(SocketContext)

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    // only connect while on /chat
    if (location.pathname !== '/chat') {
      if (socketRef.current) {
        disconnectSocket()
        socketRef.current = null
        setSocket(null)
        setIsConnected(false)
      }
      return
    }

    const token = getStoredToken()
    if (!token) {
      if (socketRef.current) {
        disconnectSocket()
        socketRef.current = null
        setSocket(null)
        setIsConnected(false)
      }
      return
    }

    const newSocket = connectSocket()
    socketRef.current = newSocket
    setSocket(newSocket)

    newSocket.on('connect', () => {
      // console.log('Connected to socket server')
      setIsConnected(true)
    })

    newSocket.on('disconnect', () => {
      // console.log('Disconnected from socket server')
      setIsConnected(false)
    })

    return () => {
      if (socketRef.current) {
        socketRef.current.off('connect')
        socketRef.current.off('disconnect')
      }
      disconnectSocket()
      socketRef.current = null
      setSocket(null)
      setIsConnected(false)
    }
  }, [location.pathname])

  const sendMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
    if (socketRef.current) {
      socketRef.current.emit('sendMessage', {
        ...message,
        timestamp: new Date(),
      })
    }
  }

  const disconnect = () => {
    disconnectSocket()
    if (socketRef.current) {
      try {
        socketRef.current.disconnect()
      } catch (e) {
        /* ignore */
      }
      socketRef.current = null
    }
    setSocket(null)
    setIsConnected(false)
  }

  return (
    <SocketContext.Provider value={{ socket, isConnected, sendMessage, disconnect }}>
      {children}
    </SocketContext.Provider>
  )
}