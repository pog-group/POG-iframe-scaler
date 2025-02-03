
// import * as SF from 'somefunctions';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// import http from 'http';

const app = express()

import config from './config.js'

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

/*

pog-group.com/3x3/1/1920x1080/470x270?url=blablacameramatrix.com
            decoupage input image / which zone / input image size / output image resize (optional)

/4x4/0/1920x1080?url=http://localhost:8290/assets/image_4x4.png

*/

const __siteRoot = path.resolve(__dirname + "/../public/")

// Middleware to parse JSON requests
app.use(express.json());

// Basic route
app.get('/', (_req: express.Request, res: express.Response): any => {
    console.log(`[server] ${_req.method} ${_req.path}`)

    res.send('Home page')
});


app.get("/assets/*", (req: express.Request, res: express.Response): any => {
    
    let _path = path.resolve(__siteRoot + req.path)
    console.log("path:",_path)
    if(fs.existsSync(_path)) {
        return res.sendFile(_path)
    } else {
        return res.send({
            status: 404,
            message: "Ressource not found"
        })
    }

})

app.get("/site/*", (_req,res) => {

    if(fs.existsSync(path.resolve(__siteRoot + _req.path + ".html"))) {
        return res.sendFile(path.resolve(__siteRoot + _req.path + ".html"))
    }

    return;
})

app.get('/image/:matrixSize/:zone/:inputSize/:outputSize?', (req: express.Request, res: express.Response): any => {
    processCut("image",req,res)

})
app.get('/iframe/:matrixSize/:zone/:inputSize/:outputSize?', (req: express.Request, res: express.Response): any => {
    processCut("iframe",req,res)
})


function processCut(cutType: "image" | "iframe", req: express.Request, res:express.Response) {
    // input validation

    let regexes = {
        size: /^(\d+)x(\d+)$/,
        number: /^(\d+)$/
    }

    function sendError(text: string) {
        res.send({
            status: 400,
            message: "Malformed URL.",
            error: text,
            informations: {
                url: "/cut/:matrixSize/:zone/:inputSize/:outputSize?",
                matrixSize: "{number}x{number}",
                zone: "{number}",
                inputSize: "{number}x{number}",
                outputSize: "{number}x{number}",
            }
        })
        return;
    }

    if(regexes.size.test(req.params?.matrixSize ?? "") !== true) {
        return sendError("matrixSize is invalid")
    }
    if(regexes.number.test(req.params?.zone ?? "") !== true) {
        return sendError("zone is invalid")
    }
    if(regexes.size.test(req.params?.inputSize ?? "") !== true) {
        return sendError("inputSize is invalid")
    }
    if(regexes.size.test(req.params?.outputSize ?? "") !== true && req.params?.outputSize !== undefined) {
        return sendError("outputSize is invalid")
    }


    const temp_matrixSize = req.params.matrixSize.match(regexes.size)
    const matrixSize = {
        x: temp_matrixSize?.[1] as unknown as number,
        y: temp_matrixSize?.[2] as unknown as number
    }

    const temp_inputSize = req.params.inputSize.match(regexes.size)
    const inputSize = {
        x: temp_inputSize?.[1] as unknown as number,
        y: temp_inputSize?.[2] as unknown as number,
    }

    const temp_outputSize = req.params?.outputSize?.match(regexes.size) ?.[0] ?? undefined
    const outputSize = {
        x: temp_outputSize?.[1] as unknown as number ?? undefined,
        y: temp_outputSize?.[2] as unknown as number ?? undefined,
    }


    if(parseInt(req.params.zone) > ((matrixSize.x * matrixSize.y) - 1) ) {
        sendError(`Zone number is higher than max matrix cell number. Matrix in ${matrixSize.x}x${matrixSize.y} only accept number from 0 to ${(matrixSize.x * matrixSize.y) - 1}`)
        return;
    }


    function getCoords(matrixWidth: number, matrixHeight: number, num:number) {
        if (num < 0 || num >= matrixWidth * matrixHeight) {
            throw new Error("Number is out of bounds for the given matrix size");
        }
        
        const x = num % matrixWidth;
        const y = Math.floor(num / matrixWidth);
        return [x, y];
    }

    let coords = getCoords(matrixSize.x, matrixSize.y, parseInt(req.params.zone))

    const imageCutInfos = {
        matrix: {
            width: req.params.matrixSize?.split("x")?.[0],
            height: req.params.matrixSize?.split("x")?.[1],
        },
        zone: {
            number: parseInt(req.params.zone),
            x: coords[0],
            y: coords[1]
        },
        inputSize: {
            x: inputSize.x,
            y: inputSize.y
        },
        outputSize: {
            x: outputSize.x,
            y: outputSize.y
        }
    }

    console.log("imageCutInfos:",imageCutInfos)


    const fileUrl = cutType == "iframe" ? "./public/site/iframe2.html" : "./public/site/image.html"
    let file = fs.readFileSync(fileUrl,"utf-8")

    let dict: {
        [key:string]: any
    } = {
        "{{matrix.width}}":     imageCutInfos.matrix.width,
        "{{matrix.height}}":    imageCutInfos.matrix.height,
        "{{matrix.x}}":         imageCutInfos.zone.x,
        "{{matrix.y}}":         imageCutInfos.zone.y,
        "{{inputSize.x}}":      imageCutInfos.inputSize.x,
        "{{inputSize.y}}":      imageCutInfos.inputSize.y,
        "{{source.url}}":        req.query.url
    }

    for(let key in dict) {
        file = file.split(key).join(dict[key])
    }

    res.header('image/png')
    res.send(file)

    return
    
}


app.get('*', (_req: express.Request, res: express.Response): any => {
    return res.send({
        status: 400,
        message: "Bad request"
    })
})


// Start the server
app.listen(config.server.port, () => {
    console.log(`Server is running on http://localhost:${config.server.port}`);
});

