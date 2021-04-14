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

  const addProduct = async (productId: number) => {
    try {
      const estoque = await api.get(`/stock/${productId}`);
      const stock: Stock = estoque.data;
      const exists = cart.filter((data) => data.id === productId);

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
        const newProductCart = cart.map((product) => {
          if (product.id === productId) {
            if (stock.amount < product.amount + 1) {
              throw new Error("Quantidade solicitada fora de estoque");
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
      if (e.message.includes("estoque")) {
        const notify = () =>
          toast.error("Quantidade solicitada fora de estoque");
        notify();
      } else {
        const notify = () => toast.error("Erro na adição do produto");
        notify();
      }
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updateCart = [...cart];
      const productIndex = updateCart.findIndex(
        (product) => product.id === productId
      );

      if (productIndex >= 0) {
        updateCart.splice(productIndex, 1);
        setCart(updateCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(updateCart));
      } else {
        throw Error();
      }
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const estoque = await api.get(`/stock/${productId}`);
      const stock: Stock = estoque.data;

      if (stock.amount >= amount) {
        const updateItem = cart.map((item) => {
          if (item.id === productId) {
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

        toast.success("Quantidade alterada!");
      } else {
        toast.error("Quantidade solicitada fora de estoque");
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
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
