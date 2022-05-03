import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dayjs from "dayjs";
import dotenv from "dotenv";
import Joi from "joi";

dotenv.config();
let db;

const app = express();
app.use(cors());
app.use(express.json());

app.post("/participants", async (req, res) => {
    const pessoa = req.body;
    const mongoClient = new MongoClient(process.env.MONGO_API);

    const schema = Joi.object({
        name: Joi.string().min(1).required(),
    });
    const validation = schema.validate({name: pessoa.name});

    if(validation.error){
        res.sendStatus(422);
        return
    }

    try {
        await mongoClient.connect();
        db = mongoClient.db("test");

        const nameInsert = await db.collection("users").findOne({name: pessoa.name});
        if(nameInsert){
            console.log("Nome de usuário já existente");
            res.sendStatus(409);
            // mongoClient.close();
            return
        }

        await db.collection("users").insertOne({name: pessoa.name, lastStatus: Date.now()});

        await db.collection("messages").insertOne({
            from: pessoa.name,
            to: 'Todos', 
            text: 'entra na sala...', 
            type: 'status', 
            time: dayjs().format("HH:mm:ss")
        });
        res.sendStatus(201);
        mongoClient.close();
    }
    catch(error){
        console.log(error);
        res.sendStatus(500);
        mongoClient.close();
    }
});

app.get("/participants", async (req, res) => {
    const mongoClient = new MongoClient(process.env.MONGO_API);

    try {
        await mongoClient.connect();
        db = mongoClient.db("test");
        const usuarios = await db.collection("users").find({}).toArray();
        res.send(usuarios);
        mongoClient.close();
    }
    catch(error){
        console.log(error);
        res.sendStatus(500);
        mongoClient.close();
    }
});

app.post("/messages", async (req, res) => {
    const mensagem = req.body;
    const user = req.headers;
    const mongoClient = new MongoClient(process.env.MONGO_API);

    const schema = Joi.object({
        to: Joi.string().min(1).required(),
        text: Joi.string().min(1).required(),
        type: Joi.string().valid("message", "private_message").required(),
        from: Joi.string().min(1).required()
    });

    try {
        mongoClient.connect();
        db = mongoClient.db("test");

        const validation = schema.validate({
            to: mensagem.to,
            text: mensagem.text,
            type: mensagem.type,
            from: user.user
        });

        if(validation.error){
            console.log(error);
            res.sendStatus(422);
            mongoClient.close();
            return
        }

        await db.collection("messages").insertOne({
            to: mensagem.to,
            text: mensagem.text,
            type: mensagem.type,
            from: user.user,
            time: dayjs().format("HH:mm:ss")
        })
        res.sendStatus(201);
        mongoClient.close();
    }
    catch(error){
        console.log(error);
        res.sendStatus(500);
        mongoClient.close();
    }
});

app.get("/messages", async (req, res) => {
    const limit = parseInt(req.query.limit);
    const user = req.headers.user;
    const mongoClient = new MongoClient(process.env.MONGO_API);

    try {
        await mongoClient.connect();
        db = mongoClient.db("test");

        function messageFilter(messageInfo, check){
            return messageInfo === check;
        }
        function typeFilter(messageType, typeCheck){
            return messageType === typeCheck;
        }
        
        const AllMessages = await db.collection("messages").find({}).toArray();
        const YourMessages = AllMessages.filter(message =>{
            return messageFilter(message.to, user) || messageFilter(message.to.toLowerCase(), "todos") || messageFilter(message.from, user) || typeFilter(message.type, "private_message")
        });
        res.send(YourMessages === parseInt(limit) || !limit ? YourMessages : YourMessages.slice(YourMessages.length - limit, YourMessages.length));
        mongoClient.close();
    }
    catch(error){
        console.log(error);
        res.sendStatus(500);
        mongoClient.close();
    }
})

app.listen(5000, () => {
    console.log("Servidor funcional")
});