'use client'

import { useState, useEffect, useCallback } from 'react'
import * as SignalR from '@microsoft/signalr'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, X } from 'lucide-react'

export default function SignalRTester() {
  const [url, setUrl] = useState('')
  const [connection, setConnection] = useState<SignalR.HubConnection | null>(null)
  const [connectionStatus, setConnectionStatus] = useState('Disconnected')
  const [action, setAction] = useState('')
  const [messages, setMessages] = useState<string[]>([])
  const [inputs, setInputs] = useState<string[]>([''])
  const [newListener, setNewListener] = useState('')
  const [listeners, setListeners] = useState<string[]>([])
  const [isInitialised, setIsInitialised] = useState<boolean>(false)

  useEffect(() => {
    const savedUrl = localStorage.getItem('signalRUrl')
    const savedAction = localStorage.getItem('signalRAction')
    const savedInputs = localStorage.getItem('signalRInputs')
    const savedListeners = localStorage.getItem('signalRListeners')

    if (savedUrl) setUrl(savedUrl)
    if (savedAction) setAction(savedAction)
    if (savedInputs) {
      const parsedInputs = JSON.parse(savedInputs)
      setInputs(Array.isArray(parsedInputs) && parsedInputs.length > 0 ? parsedInputs : [''])
    }
    if (savedListeners) {
      const parsedListeners = JSON.parse(savedListeners)
      setListeners(Array.isArray(parsedListeners) ? parsedListeners : [])
    }
    setIsInitialised(true);
  }, [])

  useEffect(() => {
    if (!isInitialised) return;
    localStorage.setItem('signalRUrl', url)
    localStorage.setItem('signalRAction', action)
    localStorage.setItem('signalRInputs', JSON.stringify(inputs))
    localStorage.setItem('signalRListeners', JSON.stringify(listeners))
  }, [url, action, inputs, listeners])

  const connect = useCallback(async () => {
    if (connection) {
      await connection.stop()
    }

    const newConnection = new SignalR.HubConnectionBuilder()
      .withUrl(url)
      .withAutomaticReconnect()
      .build()

    try {
      await newConnection.start()
      setConnection(newConnection)
      setConnectionStatus('Connected')
      setMessages(prev => [...prev, 'Connected to the hub'])

      // Set up listeners
      listeners.forEach(listener => {
        newConnection.on(listener, (...args) => {
          setMessages(prev => [...prev, `Received on ${listener}: ${JSON.stringify(args)}`])
        })
      })
    } catch (err) {
      console.error('Error connecting to the hub:', err)
      setMessages(prev => [...prev, `Error connecting to the hub: ${err}`])
    }
  }, [url, connection, listeners])

  const sendMessage = useCallback(async () => {
    if (!connection) {
      setMessages(prev => [...prev, 'Not connected to a hub'])
      return
    }

    try {
      await connection.invoke(action, ...inputs)
      setMessages(prev => [...prev, `Sent: ${action} - ${inputs.join(', ')}`])
    } catch (err) {
      console.error('Error sending message:', err)
      setMessages(prev => [...prev, `Error sending message: ${err}`])
    }
  }, [connection, action, inputs])

  const addInput = useCallback(() => {
    setInputs(prev => [...prev, ''])
  }, [])

  const removeInput = useCallback((index: number) => {
    setInputs(prev => prev.filter((_, i) => i !== index))
  }, [])

  const updateInput = useCallback((index: number, value: string) => {
    setInputs(prev => {
      const newInputs = [...prev]
      newInputs[index] = value
      return newInputs
    })
  }, [])

  const addListener = useCallback(() => {
    if (newListener && !listeners.includes(newListener)) {
      setListeners(prev => [...prev, newListener])
      setNewListener('')
      if (connection) {
        connection.on(newListener, (...args) => {
          setMessages(prev => [...prev, `Received on ${newListener}: ${JSON.stringify(args)}`])
        })
      }
    }
  }, [newListener, listeners, connection])

  const removeListener = useCallback((listener: string) => {
    setListeners(prev => prev.filter(l => l !== listener))
    if (connection) {
      connection.off(listener)
    }
  }, [connection])

  useEffect(() => {
    return () => {
      if (connection) {
        connection.stop()
      }
    }
  }, [connection])

  return (
    <div className="container mx-auto p-4">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>SignalR Connection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter SignalR hub URL"
              className="flex-grow"
            />
            <Button onClick={connect}>Connect</Button>
          </div>
          <div className="mt-2">Status: {connectionStatus}</div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Send Message</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            type="text"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="Enter action"
            className="mb-2"
          />
          {inputs.map((input, index) => (
            <div key={index} className="flex space-x-2 mb-2">
              <Input
                type="text"
                value={input}
                onChange={(e) => updateInput(index, e.target.value)}
                placeholder={`Enter argument ${index + 1}`}
                className="flex-grow"
              />
              {index === inputs.length - 1 ? (
                <Button onClick={addInput} variant="outline" size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={() => removeInput(index)} variant="outline" size="icon">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button onClick={sendMessage}>Send</Button>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Add Listeners</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2 mb-2">
            <Input
              type="text"
              value={newListener}
              onChange={(e) => setNewListener(e.target.value)}
              placeholder="Enter listener name"
              className="flex-grow"
            />
            <Button onClick={addListener} variant="outline" size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {listeners.map((listener, index) => (
            <div key={index} className="flex items-center space-x-2 mb-2">
              <div className="flex-grow">{listener}</div>
              <Button onClick={() => removeListener(listener)} variant="outline" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-64 overflow-y-auto">
            {messages.map((message, index) => (
              <div key={index} className="mb-1">{message}</div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
