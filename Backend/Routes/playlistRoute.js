import express from "express";
const router = express.Router();

router.post("/playlist", (req,res)=>{
    const data = req.body;
    if(!data.url){
        return res.status(400).json({error: "URL is required"})
    }
    console.log("Data received", data);
    
    try{
    const url = new URL(data.url);
    const id = url.pathname.split('/').pop();

    res.status(201).json({
        message: "Data received succesfully",
        data: id
    })
   }catch (error){
    res.status(400).json({error: "Invalid url provided"})
   }
})

export default router