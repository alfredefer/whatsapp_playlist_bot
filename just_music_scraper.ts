import makeWASocket from '@adiwajshing/baileys'

import makeWASocket, { DisconnectReason } from '@adiwajshing/baileys'
import { Boom } from '@hapi/boom'

import makeWASocket, { makeInMemoryStore } from '@adiwajshing/baileys'
// the store maintains the data of the WA connection in memory
// can be written out to a file & read from it
const store = makeInMemoryStore({ })
// can be read from a file
store.readFromFile('./baileys_store.json')
// saves the state to a file every 10s
setInterval(() => {
    store.writeToFile('./baileys_store.json')
}, 10_000)

const sock = makeWASocket({ })
// will listen from this socket
// the store can listen from a new socket once the current socket outlives its lifetime
store.bind(sock.ev)

sock.ev.on('chats.set', () => {
    // can use "store.chats" however you want, even after the socket dies out
    // "chats" => a KeyedDB instance
    console.log('got chats', store.chats.all())
})

sock.ev.on('contacts.set', () => {
    console.log('got contacts', Object.values(store.contacts))
})

async function connectToWhatsApp () {
    const sock = makeWASocket({
        // can provide additional config here
        printQRInTerminal: true
    })
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if(connection === 'close') {
            const shouldReconnect = (lastDisconnect.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
            console.log('connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect)
            // reconnect if not logged out
            if(shouldReconnect) {
                connectToWhatsApp()
            }
        } else if(connection === 'open') {
            console.log('opened connection')
        }
    })
    sock.ev.on('messages.upsert', m => {
        console.log(JSON.stringify(m, undefined, 2))

        console.log('replying to', m.messages[0].key.remoteJid)
        await sock.sendMessage(m.messages[0].key.remoteJid!, { text: 'Hello there!' })
    })
}
// run in main file
connectToWhatsApp()

type SocketConfig = {
    /** the WS url to connect to WA */
    waWebSocketUrl: string | URL
    /** Fails the connection if the socket times out in this interval */
	connectTimeoutMs: number
    /** Default timeout for queries, undefined for no timeout */
    defaultQueryTimeoutMs: number | undefined
    /** ping-pong interval for WS connection */
    keepAliveIntervalMs: number
    /** proxy agent */
	agent?: Agent
    /** pino logger */
	logger: Logger
    /** version to connect with */
    version: WAVersion
    /** override browser config */
	browser: WABrowserDescription
	/** agent used for fetch requests -- uploading/downloading media */
	fetchAgent?: Agent
    /** should the QR be printed in the terminal */
    printQRInTerminal: boolean
    /** should events be emitted for actions done by this socket connection */
    emitOwnEvents: boolean
    /** provide a cache to store media, so does not have to be re-uploaded */
    mediaCache?: NodeCache
    /** custom upload hosts to upload media to */
    customUploadHosts: MediaConnInfo['hosts']
    /** time to wait between sending new retry requests */
    retryRequestDelayMs: number
    /** time to wait for the generation of the next QR in ms */
    qrTimeout?: number;
    /** provide an auth state object to maintain the auth state */
    auth: AuthenticationState
    /** manage history processing with this control; by default will sync up everything */
    shouldSyncHistoryMessage: (msg: proto.Message.IHistorySyncNotification) => boolean
    /** transaction capability options for SignalKeyStore */
    transactionOpts: TransactionCapabilityOptions
    /** provide a cache to store a user's device list */
    userDevicesCache?: NodeCache
    /** marks the client as online whenever the socket successfully connects */
    markOnlineOnConnect: boolean
    /**
     * map to store the retry counts for failed messages;
     * used to determine whether to retry a message or not */
    msgRetryCounterMap?: MessageRetryMap
    /** width for link preview images */
    linkPreviewImageThumbnailWidth: number
    /** Should Baileys ask the phone for full history, will be received async */
    syncFullHistory: boolean
    /** Should baileys fire init queries automatically, default true */
    fireInitQueries: boolean
    /**
     * generate a high quality link preview,
     * entails uploading the jpegThumbnail to WA
     * */
    generateHighQualityLinkPreview: boolean

    /** options for axios */
    options: AxiosRequestConfig<any>
    /**
     * fetch a message from your store
     * implement this so that messages failed to send (solves the "this message can take a while" issue) can be retried
     * */
    getMessage: (key: proto.IMessageKey) => Promise<proto.IMessage | undefined>
    
    /** Emulate the desktop version to get more messages
     * 
     */
    const conn = makeWASocket({
        ...otherOpts,
        // can use Windows, Ubuntu here too
        browser: Browsers.macOS('Desktop'),
        syncFullHistory: true
    })
}

/** To query the metadata of a group
*/
const metadata = await sock.groupMetadata("just-music@g.us") 
console.log(metadata.id + ", title: " + metadata.subject + ", description: " + metadata.desc)