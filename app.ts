import { feathers } from '@feathersjs/feathers'
import { koa, rest, bodyParser, errorHandler, serveStatic } from '@feathersjs/koa'
import socketio from '@feathersjs/socketio'
import { NotFound } from '@feathersjs/errors'

// This is the interface for the message data
interface Message {
  id?: number
  text: string
}

// A messages service that implements full CRUD operations
class MessageService {
  messages: Message[] = []
  private nextId = 1

  // READ: Get all messages
  async find() {
    return this.messages
  }

  // READ: Get a single message by ID
  async get(id: number) {
    const message = this.messages.find((m) => m.id === id)
    if (!message) {
      throw new NotFound(`Message with id ${id} not found`)
    }
    return message
  }

  // CREATE: Create a new message
  async create(data: Pick<Message, 'text'>) {
    const message: Message = {
      id: this.nextId++,
      text: data.text
    }
    this.messages.push(message)
    return message
  }

  // UPDATE: Replace an entire message
  async update(id: number, data: Message) {
    const index = this.messages.findIndex((m) => m.id === id)
    if (index === -1) {
      throw new NotFound(`Message with id ${id} not found`)
    }
    const message: Message = { ...data, id }
    this.messages[index] = message
    return message
  }

  // UPDATE: Partially update a message
  async patch(id: number, data: Partial<Pick<Message, 'text'>>) {
    const index = this.messages.findIndex((m) => m.id === id)
    if (index === -1) {
      throw new NotFound(`Message with id ${id} not found`)
    }
    const existingMessage = this.messages[index]!
    const message: Message = {
      id,
      text: data.text ?? existingMessage.text
    }
    this.messages[index] = message
    return message
  }

  // DELETE: Remove a message
  async remove(id: number) {
    const index = this.messages.findIndex((m) => m.id === id)
    if (index === -1) {
      throw new NotFound(`Message with id ${id} not found`)
    }
    const message = this.messages[index]
    this.messages.splice(index, 1)
    return message
  }
}

// This tells TypeScript what services we are registering
type ServiceTypes = {
  messages: MessageService
}

// Creates an KoaJS compatible Feathers application
const app = koa<ServiceTypes>(feathers())

// Use the current folder for static file hosting
app.use(serveStatic('.'))
// Register the error handle
app.use(errorHandler())
// Parse JSON request bodies
app.use(bodyParser())

// Register REST service handler
app.configure(rest())
// Configure Socket.io real-time APIs
app.configure(socketio())
// Register our messages service
app.use('messages', new MessageService())

// Add any new real-time connection to the `everybody` channel
app.on('connection', (connection) => app.channel('everybody').join(connection))
// Publish all events to the `everybody` channel
app.publish((_data) => app.channel('everybody'))

// Start the server
app
  .listen(3030)
  .then(() => console.log('Feathers server listening on localhost:3030'))

// For good measure let's create a message
// So our API doesn't look so empty
app.service('messages').create({
  text: 'Hello world from the server'
})