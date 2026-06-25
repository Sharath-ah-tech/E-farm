import { useEffect } from "react"
import { useNavigate } from "react-router-dom"

function Logout({ setUserName }) {
    const navigate = useNavigate()

    useEffect(() => {
        setUserName("")
        navigate("/")
        localStorage.removeItem('access')
        localStorage.removeItem('refresh')
        localStorage.removeItem('username')
    }, [setUserName, navigate])

    return null
}

export default Logout