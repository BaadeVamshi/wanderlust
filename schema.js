const Joi=require("joi");

module.exports.listingSchema = Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    image: Joi.object({  
        url: Joi.string(),
        filename: Joi.string()
    }).optional(), 
    price: Joi.number().min(0).required(),
    location: Joi.string().required(),
    country: Joi.string().required()
});


module.exports.reviewSchema=Joi.object({
    review:Joi.object({
        rating:Joi.number().required().min(1).max(5),
        comment:Joi.string().required(),
    }).required()
});



module.exports.userSchema = Joi.object({
    email: Joi.string()
        .email()
        .regex(/^[a-zA-Z0-9._%+-]+@gmail\.com$/) // Only allows gmail.com
        .required()
        .messages({
            "string.pattern.base": "Only Gmail accounts are allowed!",
            "string.email": "Invalid email format!",
            "any.required": "Email is required!"
        }),
    username: Joi.string().min(2).required().messages({
        "string.min": "Username must be at least 3 characters long",
        "any.required": "Username is required!"
    }),
    password: Joi.string().min(6).required().messages({
        "string.min": "Password must be at least 6 characters long",
        "any.required": "Password is required!"
    })
});
