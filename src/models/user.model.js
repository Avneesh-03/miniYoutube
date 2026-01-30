import mongoose,{Schema} from "mongoose"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"


const userSchema = new Schema({
    username : {
        type : String,
        required : true,
        lowercase : true,
        unique : true,
        index : true
    },
    email : {
        type : String,
        required : true,
        lowercase : true,
        unique : true
    },
    fullname : {
        type : String,
        required : true,
        lowercase : true
    },
    avatar : {
        type : String, // clodinary url
        required : true,
        
    },
    coverImage : {
        type : String, // clodinary url
        
        
    },
    password : {
        type : String,
        required : [true,'password is required'],
       
    },
    watchHistory : [
        {
            type : Schema.Types.ObjectId,
            ref : "Video"
        }
    ],
    refreshToken : {
        type : String, 
       
        
    },
        
    
    
    
},{timestamps : true})
//do prehook for hashing pasword before saving it
userSchema.pre("save",async function(){
    if(!this.isModified("password")) return ;

    this.password = await bcrypt.hash(this.password,10)
    
})
//creating my own custom method for userSchema  Remember the way
userSchema.methods.isPasswordCorrect = async function(password){
    
   return await bcrypt.compare(password,this.password)
}
userSchema.methods.generateAccessToken = function(){
    return jwt.sign({
        _id :this._id,
        email:this.email,
        username : this.username,
        fullname:this.fullname

    },
    process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn : process.env.ACCESS_TOKEN_EXPIRY
    }
)
}
userSchema.methods.generateRefreshToken = function(){
    return jwt.sign({
        _id :this._id,
        email:this.email,
        username : this.username,
        fullname:this.fullname

    },
    process.env.REFRESH_TOKEN_SECRET,
    {
        expiresIn : process.env.REFRESH_TOKEN_EXPIRY
    })
}

//checking of paasword
export const User = mongoose.model("User",userSchema);