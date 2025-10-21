

const asyncHandler =(requestHandler) =>{
  return  (req,res,next) => {
        Promise.resolve(
            requestHandler(req,res,next)
        ).reject(
            (err) =>next(err)
        )
    }
}



//const asyncHandler = () => {}
//const asynHandler = (func) => () => {}
//const asynHandler = (func) => async () => {}


// const asyncHandler = (fn) => async(req,res,next)=>{
//     try {
//         await fn(req,res)
//     } catch (error) {
//         res.status(error.code || 500).json({
//             success: false,
//             message: error.message

//         })
//     }
// }

export { asyncHandler }
