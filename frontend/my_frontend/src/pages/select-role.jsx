import api from '../api/axios'
import {useNavigate} from "react-router-dom"
function SelectRole() {
  const navigate = useNavigate()

  const chooseRole = async(role) => {
    await api.post("select-role/", {
      role
    });
    navigate("/home");
  };

  return (
    <div>
      <button onClick={() => chooseRole("farmer")}>
        Farmer
      </button>

      <button onClick={() => chooseRole("wholesaler")}>
        Wholesaler
      </button>

      <button onClick={() => chooseRole("customer")}>
        Customer
      </button>
    </div>
  );
}
export default SelectRole