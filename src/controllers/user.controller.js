import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadonCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"

const generateAccessAndRefreshToken = async(userId)=>{
    
    try {
       const user = await User.findById(userId)
      
       const refreshToken = user.generateRefreshToken();
       
       const accessToken = user.generateAccessToken (); 
        
       user.refreshToken = refreshToken
       await user.save({validateBeforeSave : false})
        return {refreshToken,accessToken}

    } catch (error) {
        console.log(error)
        throw new ApiError(500,"Something went wrong while generating tokens")
    }
}
const registerUser = asyncHandler(async (req,res)=>{
    // get user details from frontend
    // validation - not empty
    // check if user  already exist : username.email
    //check for images,check for avatar
    // upload them to cloudinary,avatar
    // user object- create in db
    // remove password and refresh token field from response
    // check for user creation
    // return response
    
    const {fullname,email,username,password} = req.body
    
    // if(fullName===""){
    //     throw new ApiError(400,"fullname is required")
    // } it was manual
    if(
        [fullname,email,username,password].some((field)=>field?.trim()=== "")
    ){
        throw new ApiError(400, "All fields are compulsary")
    }

    const existedUser = await User.findOne({
        $or : [{ username },{ email }]
    })
    if(existedUser){
        throw new ApiError(409,"User with email or username already exists")
    }
    //check for file check
   
   const avatarLocalPath = req.files?.avatar[0]?.path;
   
//    const coverImageLocalPath = req.files?.coverImage[0]?.path ;
    let coverImageLocalPath;
   if(req.files && Array.isArray(req.files.coverImage) && (req.files.coverImage.length >0)){
         coverImageLocalPath = req.files?.coverImage[0]?.path ;
    }
   
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file page is required")
    }
    //upload them to cloudinary
    
    
    const avatar = await uploadonCloudinary(avatarLocalPath)
    const coverImage = await uploadonCloudinary(coverImageLocalPath)
    
    
    //check awatar nahi to phatega
    if(!avatar){
        throw new ApiError(400,"Avatar file page is required")
    }
    //create user object 
   const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username : username.toLowerCase()

    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    
    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering the user")
    }

    return res.status(201).json(

        new ApiResponse(200,createdUser,"User registred successfully")
    )



})
//// login user
const loginUser = asyncHandler(async (req,res)=>{
    
    const {username,email,password} = req.body
    
    if(!(username || email)){
        throw new ApiError(400,"please enter username or email")
    }
   const user = await User.findOne({
        $or : [{ username },{ email }]
    })
    
    if(!user){
        throw new ApiError(404,"User not found")
    }
    const passwordc =    await user.isPasswordCorrect(password)
    
    if(!passwordc){
        throw new ApiError(402,"Invalid Credential")
    }
    const {accessToken,refreshToken} = await generateAccessAndRefreshToken(user._id)

     const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
     const options = {
        httpOnly : true,
        secure : true
     }
    
     return res
     .status(200)
     .cookie("accessToken",accessToken,options)
     .cookie("refreshToken",refreshToken,options)
     .json(
        new ApiResponse(
            200,
            {
                user : loggedInUser,accessToken,refreshToken
        },
        "User logged In Successfully"
    )
     )

})
/// logout user
const logoutUser = asyncHandler(async(req,res)=>{
   await User.findByIdAndUpdate(
        req.user._id,
        {
          $set : {
            refreshToken : undefined
          }  
        },
        {
            new : true
        }
    )
    const options = {
        httpOnly : true,
        secure : true
     }

     return res.
     status(200)
     .clearCookie("accessToken",options)
     .clearCookie("refreshToken",options)
     .json(new ApiResponse(200,{},"User loggedOut"))
})
const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken){
        throw new ApiError(401,"unauthorized request")
    }
    try {
        const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
        const user = await User.findById(decodedToken?._id)
        if(!user){
            throw new ApiError(401,"Invalid refresh token")
        }
        if(incomingRefreshToken !== user?.refreshToken){
           throw new ApiError(401,"refresh token is used") 
        }
        const options = {
            httpOnly : true,
            secure : true
        }
       const {accessToken,newrefreshToken} = await generateAccessAndRefreshToken(user._id)
       return res
       .status(200)
       .cookie("accessToken",accessToken,options)
       .cookie("refreshToken",newrefreshToken,options)
       .json(
            new ApiResponse(
                200,
                {accessToken,refreshToken : newrefreshToken},
                "Access  token refreshed"
            )
       )
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid refresh token")
    }
})

const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const{oldPassword, newPassword, confPassword} = req.body
    if(!(newPassword===confPassword)){
        throw new ApiError(400,"newpassword and confirmPassword must match")
    }
    const user = await User.findById(req.user?._id)
    const passwordcorrect = user.isPasswordCorrect(oldPassword)

    if(!passwordcorrect){
        throw new ApiError(400,"Invalid Password")
    }
    user.password = newPassword
    await user.save({validateBeforeSave : false})

    return res.status(200)
    .json(new ApiResponse(200,{},"Password changed successfully"))
})

const getCurrentUser = asyncHandler(async(req,res)=>{
    return res.status(200)
    .json(200,req.user,"current user fetched successfully")
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullname,email} = req.body
    if(!(fullname,email)){
        throw new ApiError(400,"All fields are required")
    }
    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                fullname,
                email
            }
        },
        {new : true}  //to give you updated information
    ).select("-password")

    return res.status(200)
    .json (new ApiResponse(200,user,"Account details updated successfully"))

})
const updateAvatar = asyncHandler(async(req,res)=>
{
   const avatarLocalPath = req.file?.path
   if(!avatarLocalPath){
    throw new ApiError(400,"Avatar file is missing")
   }
   const avatar = await uploadonCloudinary(avatarLocalPath)
   if(!avatar.url){
    throw new ApiError(400,"Error while uploading avatar")
   }
   const user = await User.findByIdAndUpdate(
        req.User?._id,
        {
            $set : {
                avatar : avatar.url
            }
        },
        {new : true}

   ).select("-password")

   return res
   .status(200)
   .json(new ApiResponse(200,user,"Avatar updated successfully"))
})
const updateUserCoverImage = asyncHandler(async(req,res)=>
{
   const coverImageLocalPath = req.file?.path
   if(!coverImageLocalPath){
    throw new ApiError(400,"coverImage file is missing")
   }
   const coverImage = await uploadonCloudinary(coverImageLocalPath)
   if(!coverImage.url){
    throw new ApiError(400,"Error while uploading coverImage")
   }
   const user = await User.findByIdAndUpdate(
        req.User?._id,
        {
            $set : {
                coverImage : coverImage.url
            }
        },
        {new : true}

   ).select("-password")

   return res
   .status(200)
   .json(new ApiResponse(200,user,"CoverImage updated successfully"))
})

const getUserChannelProfile = asyncHandler(async(req,res)=>{
    const {username} =req.params

    if(!username?.trim()){
        throw new ApiError(400,"Username is missing")
    }
    ///agregation pipeline
     // format to write User.aggregate([{},{},{}]) , it return arrays

    const channel = await User.aggregate([
        {
            $match:{
                username : username?.toLowerCase() //search for particular username 

            }
        },
        {
            $lookup : {//to see in categorised with that username
                from : "subscriptions", //foreign collection name
                localField:"_id",  //field in user collection
                foreignField:"channel",  //field in subscription model to compare
                as : "subscribers"
            }
        },
        {
            $lookup:{
                from : "subscriptions", //foreign collection name
                localField:"_id",  //field in user collection
                foreignField:"subscriber",  //field in subscription model to compare
                as : "subscribedTo"
            }
        },
        {
            $addFields : {
                subscribersCount : {
                    $size : "$subscribers"
                },
                channelsSubscribedToCount : {
                    $size : "$subscribedTo"
                },
                isSubscribed:{
                    $cond : {
                        if : {$in : [req.user?._id,"$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },{
            $project:{
                fullname:1,
                username:1,
                subscribersCount:1,
                channelsSubscribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1,
            }
        }
    ])
})

const getWatchHistory = asyncHandler(async(req,res)=>{
    const user = await User.aggregate([
        {
            //abhi to sirf kam ke document mile hain
            $match :{
                _id:new mongoose.Types.ObjectId(req.user._id)     //don't do any  querry direct give mongoid
            }
        },
        {
            $lookup : {
                from :"videos",
                localField : "watchHistory",
                foreignField : "_id",
                as : "watchHistory",
                ///for sub-pipelines
                pipeline:[{
                        $lookup : {
                            from : "users",
                            localField : "owner",
                            foreignField : "_id",
                            as : "owner",
                            pipeline:[{
                                $project : {
                                    fullname:1,
                                    username :1,
                                    avatar :1
                                }
                            }]
                        }
                        },
                        //to make data structure better owner has complete array of data,all projection data on first element
                        {
                            $addFields:{
                                owner : {
                                    //array element at
                                    $first : "$owner"  //draw from fields
                                }
                            }
                        }
                    ],
            }
        }

    ])
    return res.status(200)
    .json(new ApiResponse(200,user[0].watchHistory),"Generated watch history")
})

export {registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}