import fs from 'node:fs/promises'
import express from 'express'
import { Transform } from 'node:stream'
import morgan from 'morgan'
import nodemailer from 'nodemailer'
import axios from 'axios';

// Constants
const isProduction = process.env.NODE_ENV === 'production'
const port = process.env.PORT || 5173
const base = process.env.BASE || '/'
const ABORT_DELAY = 10000

// Cached production assets
const templateHtml = isProduction
  ? await fs.readFile('./dist/client/index.html', 'utf-8')
  : ''
const ssrManifest = isProduction
  ? await fs.readFile('./dist/client/.vite/ssr-manifest.json', 'utf-8')
  : undefined

// Create http server
const app = express()

// Add Vite or respective production middlewares
let vite
if (!isProduction) {
  const { createServer } = await import('vite')
  vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    base
  })
  app.use(vite.middlewares)
} else {
  const compression = (await import('compression')).default
  const sirv = (await import('sirv')).default
  app.use(compression())
  app.use(base, sirv('./dist/client', { extensions: [] }))
}

morgan.token('id', function(req, res) {
  return req.hostname; 
});

app.post('/send', function (req, res) {
  const postData = req.query; 

  try {
    const transporter = nodemailer.createTransport({
      host: "mail.lion-t.ru",
      port: 25,
      secure: false,
      auth: {
        user: "reports@lion-t.ru",
        pass: "b26aedBi7"
      }
    })

    const mailOptions = {
      from: "Lion@lion-t.ru",
      //to: "personal@lion-t.ru, " + postData.to,
      to: "vitkot@lion-t.ru",
      subject: postData.tittle,
      html: postData.body
    }

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return res.status(200).send("При отправке заявки произошла ошибка!") 
      }
      return res.status(200).send("Ваша заявка успешно отправлена!");
    })
  } catch (e) {
    return res.status(200).send("При отправке заявки произошла ошибка!") 
  }
})

// Serve HTML
app.use(morgan('[:method] :id:url :response-time ms'), async (req, res) => {
  try {
    const url = req.originalUrl.replace(base, '')

    let template
    let render
    if (!isProduction) {
      // Always read fresh template in development
      template = await fs.readFile('./index.html', 'utf-8')
      template = await vite.transformIndexHtml(url, template)
      render = (await vite.ssrLoadModule('/src/entry-server.jsx')).render
    } else {
      template = templateHtml
      render = (await import('./dist/server/entry-server.js')).render
    }

    let didError = false

    const { pipe, abort } = render(url, ssrManifest, {
      onShellError() {
        res.status(500)
        res.set({ 'Content-Type': 'text/html' })
        res.send('<h1>Something went wrong</h1>')
      },
      onShellReady() {
        res.status(didError ? 500 : 200)
        res.set({ 'Content-Type': 'text/html' })

        const transformStream = new Transform({
          transform(chunk, encoding, callback) {
            res.write(chunk, encoding)
            callback()
          }
        })

        const [htmlStart, htmlEnd] = template.split(`<!--app-html-->`)

        res.write(htmlStart)

        transformStream.on('finish', () => {
          res.end(htmlEnd)
        })

        pipe(transformStream)
      },
      onError(error) {
        didError = true
        console.error(error)
      }
    })

    setTimeout(() => {
      abort()
    }, ABORT_DELAY)
  } catch (e) {
    vite?.ssrFixStacktrace(e)
    console.log(e.stack)
    res.status(500).end(e.stack)
  }
})

// Start http server
app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`)
})

