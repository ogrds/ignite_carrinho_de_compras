import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const [stock, setStock] = useState<Stock[]>([]);

  useEffect(() => {
    async function getEstoque() {
      const estoque = await api.get("stock");
      setStock(estoque.data);
    }
    getEstoque();
  }, []);

  const addProduct = async (productId: number) => {
    try {
      const exists = cart.filter((data) => data.id == productId);

      if (exists.length === 0) {
        const { data } = await api.get(`/products/${productId}`);
        const newProductCart = {
          id: data.id,
          image: data.image,
          price: data.price,
          title: data.title,
          amount: 1,
        };
        setCart([...cart, newProductCart]);
        localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify([...cart, newProductCart])
        );
        const notify = () => toast.success("Produto adicionado com sucesso!");
        notify();
      } else {
        const newStock = stock.filter((item) => {
          return item.id === productId;
        });
        const isOnStock: Stock = newStock[0];

        const newProductCart = cart.map((product) => {
          if (product.id === productId) {
            if (isOnStock.amount < product.amount + 1) {
              throw "Quantidade solicitada fora de estoque";
            }
            return {
              id: product.id,
              image: product.image,
              price: product.price,
              title: product.title,
              amount: product.amount + 1,
            };
          }
          return {
            id: product.id,
            image: product.image,
            price: product.price,
            title: product.title,
            amount: product.amount,
          };
        });

        setCart(newProductCart);
        localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify(newProductCart)
        );
        const notify = () => toast.success("Produto adicionado com sucesso!");
        notify();
      }
    } catch (e) {
      if (e.includes("estoque")) {
        const notify = () => toast.error(e);
        notify();
      } else {
        const notify = () => toast.error("Erro ao adicionar produto!");
        notify();
      }
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const removeItem = cart.filter((item) => {
        return item.id !== productId;
      });

      setCart(removeItem);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(removeItem));

      const notify = () => toast.success("Produto removido com sucesso!");
      notify();
    } catch {
      const notify = () => toast.error("Erro ao remover produto.");
      notify();
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const newStock = stock.filter((item) => {
        return item.id === productId;
      });
      const isOnStock: Stock = newStock[0];

      const updateItem = cart.map((item) => {
        if (item.id === productId) {
          if (isOnStock.amount < amount) {
            throw "Quantidade solicitada fora de estoque";
          }
          return {
            id: item.id,
            image: item.image,
            price: item.price,
            title: item.title,
            amount: amount,
          };
        }
        return {
          id: item.id,
          image: item.image,
          price: item.price,
          title: item.title,
          amount: item.amount,
        };
      });

      setCart(updateItem);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updateItem));

      const notify = () => toast.success("Quantidade alterada!");
      notify();
    } catch (e) {
      if (e.includes("estoque")) {
        const notify = () => toast.error(e);
        notify();
      } else {
        const notify = () => toast.error("Erro ao adicionar produto!");
        notify();
      }
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
