import api from './axios'

export const addToCart = (productId) =>{
    api.post("cart/",{product:productId, quantity:1})
}
export const getCart = ()=>{
    api.get("cart/")
}