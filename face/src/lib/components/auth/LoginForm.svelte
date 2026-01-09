<script lang="ts">
  import { checkAuth, authState } from '$lib/auth/auth';
  import { onMount } from 'svelte';
  import { systemState } from '$lib/system';
  import { goto } from '$app/navigation';
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { toast } from "svelte-sonner";
  import ThemeToggle from '@/components/ThemeToggle.svelte';
  import { 
    LoaderCircle,
  } from "@lucide/svelte";
  import { 
    CardHeader, 
    CardTitle, 
    CardDescription,
    CardContent,
    CardFooter
  } from "$lib/components/ui/card";

  let username = "";
  let password = "";
  let version = "";
  let loading = false;
  let error = "";

  if ($systemState.status?.version) {
    version = $systemState.status?.version
  }

  async function handleLogin() {
    loading = true;
    error = "";

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await res.json();
      console.log("loging data", data)
      if (!res.ok) throw new Error(data.error || "Login failed");

      if (res.ok) {
        const isLoggedIn = await checkAuth();
        if (isLoggedIn) {
          goto('/dashboard');
        }
      }
    } catch (e: any) {
      error = e.message;
      toast.error("Auth error:", {
        description: e.message,
        closeButton: true,
        richColors: true,
        style: "cursor: pointer;"
      }) 
    } finally {
      loading = false;
    }
  }

  onMount(async () => {
    const isLoggedIn = await checkAuth();
    console.log("isLoggedIn and isAuthenticated:", isLoggedIn, $authState.isAuthenticated)
    if (isLoggedIn && $authState.isAuthenticated) {
      goto('/dashboard');
    } else {
      goto('/');
    }
  });
</script>

<ThemeToggle
  size="icon"
  variant="outline"
  class="fixed bottom-4 left-4 z-50" 
/>

<CardHeader>
  <CardTitle class="text-2xl font-bold text-center flex justify-center">
    Silly 
    <img width="24px" height="24px"  src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADsAAAA7CAYAAADFJfKzAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAGYktHRAD/AP8A/6C9p5MAAAAHdElNRQfpDBwMNwssb2UUAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDI1LTEyLTI4VDEyOjQ5OjI3KzAwOjAwx/SWiwAAACV0RVh0ZGF0ZTptb2RpZnkAMjAyNS0xMi0yOFQxMjo0OToyNyswMDowMLapLjcAAAAodEVYdGRhdGU6dGltZXN0YW1wADIwMjUtMTItMjhUMTI6NTU6MTErMDA6MDDXUQJ/AAAfEUlEQVRo3r2bebhlVXnmf99ae+8z3XmoW/M8UAVUUcyTjKIM2qKYaKLYDh072tEkdsygrdGIaY2aaNQniQlipI3aETSIgIKAIIpAQVFVVFHzXLfq3rrzPcMe1vryx973FrQmj5g8ferZz6l7zh7Wu77p/d61jvCf8NKpIU7ecQPdr/gSzaOPMTW0icYjt9HzCQ312a90ufrhuUE6Otdm9V6cq6k6QV1LVMYtleHMtJ2sV5eN1U//nalVfyLpyasvRfrPozx3I7W1N6NDP0XaL0Sq5j80TvlVL8x0BMYGsd2n09rxbVq772D4NV+jZ/N3u93Y46tKzT3nBOn4RutH13ibLhRT77Q2KWO8RRDA4UklDRuZRuNOyycEu1+1Y1saztkUV8/c0bzigyc7b1vn7apfp+PSj9DY+x1qi69Aou7/f2B1dDujr11H12e/wMjWr1P5zR8H7sE/XFWafuaVmo5dm4VT64PSaL8tNQMtW0xkkQgIBCMhIrmFlBSXxUiqSGyg5dGW8VlSG02zrp1GSw9rsPze+uLXby7f9Zv17IrfofeKz9M6cD/lJVciJnxJ4w5eysmJV/zW23AaYN9zI2bRq8NgcPt6f+dVr49036ulNLo66EzCqC1FaxFa7odyP1LqR4J5EPSgtoKKBRS0ickmIRuF5AQ+HkJbJ03QONkX1of6skZ0cRofe2vHzp0P+dOv/UZcW/zoyIdlsnzjbYx+azXp5D7CjuX/+WDT+kEWGGHX41+ks2cVpves1VMPvP3mktv+hrA8ucK2143vCND2LrR9KVTPx0bnQ7QUCTpAOlCpgJgXOJQHEtQniI5gsqPQOoBrPYlMPY2ZPC5RfXyBGZ96c9o8dm1599H7ZMPNX4qXvuXx1ry70p72ZdR33U116eVI1P4fd2PNHG7wXuzCGxj++nWE5320TTb/9Y2lxuP/w1SGzgnaW6F2erKuBUjnpQQdF0O4AQ3mgXjUVBEEUY9BCqsW9wYUxXhBJMVJC1TBZ0i6H9/YhJ94EBnbjB2to5OWrN65r6krbm3Oufq2xt23DM57z124k9toP+cmpLLmVwfb0pRgz/3Y/lU8995VzH/3J5bq/u+/txpvv9l0jPeZ7hTX3YvtuRLTdT2U12FMiBcLhIhC2hoiSZVq+wBIBUQLF1ZUAFL81BhZ0iDq6gJbQSXLJ8d51J/ENZ7En7wLM7wdnZiGkXKrFS+4u9F5ySfm3vSVTaMP/RmM7aH9ho8QlVe8dLBNTbFbv4vtWsadizdy1T2/v9Ge+MFHKvbAtaanEWXdVUzv2ZiBG7C1M/CmHxWHVVAiEMU3JvnRN+9kZDrmdb/1LqTaBl4RQAQUQVCee+g+Hr33u9z0397MnJVr8SKgiqAAZCaGeAQz+jDZ4L2YkUPouGpSH3jK66qP8PYH74vv+QOfNUaZe/0tmNqCX4jpFxYudSnh/vswPUu4bfFGrrrr3RcFJ+7966rd8+qgtxFpbxdmwTUEi99G0H4uSITRCaxvgCZ4E4ObYu+mR/ju//kWjbrDBgHiG4i0QGKUGKWFlxQNqmx++Bl++K07aU4eQzQBMpQWUCdwLQLbgem/lmDZb+MXbMD0GanWjp8XZls+V//qFa+LX/5pa9rmM3r/J9Fs7CWAPXY/dv6ZfG/hObz6zvdeEA7e95mKPXip9HpxfXOxC99I0P8GJOhGtQ7EQAIkeImxfpSTe7bwvdv+GckSzr38XFyUgrYQjRFt5f/3TYyvs2TdUlactZon7/khz37/Hlw8hDPTxfkt0ASkDpJg2pYTLng7LLgE1xcRdk2s7Gpt/WT5q1fd2H7tLca29zP9w4+iyZGfw2X/3w/c8G7M3As4+IGlrP7j950RDN396Wp4+DLfK0jPHOz8X4Oe9WSlMkYyDAlCipABGaIxk4cPcO9Xvsm2x7ew8fKLuez110GkGJ9gSIvzEoQENCWqBqhk7PnxExzdt48587von9eNtXm2RhJEUkQSlJjMVrHlFaiJITtOkE51B42JDRPPPbi377Vf2p1NHsWdPMjH//Y7/zbYhsYM/83VtA4/TGXDf5lnD33nEzXZf73tdiLdA7glr4buNRgjGDLUNhFx5NHnEI0ZP7Sfu7/8HZ56aBO9c3u5/r+/mYElczE+BhxCNjs5SopKhiGje04PJw4c4vCO3RzZtZeB/jZ65ncjgQPS4kgQzRAfg3ikvBgvHs2OIX6qz05Nnj7y3MNbjn32M0fm/97X+eC7r+djn/nyLwb7Jzeeju1bizn9HeXgqc/9z5Lf/o6wKw58bydm3hVIx3qMzTCAmAQVDwpCCkmdweef556v3MO2H22m2lbl5f/1tWy4YgMiCZAWIFPQFGQGdIxoSqkS0DW3h2M793L8wHEO7D5Ae83QM6+KCS2Kz++hGeJTRBPUCzbqRV0D0kGipDlXphsL7eU3/Xj0oT8ff+jlH+eb6Qgf/dhfvBhsVt+N71zG9JpXEG488Kry1KYPBZ31LjpLyNzzoGsDVkDEg4nBphgc4hzxxHF2PPY0d/39A+x5Zh+Vtgovu+kaLnn9ywmiFDTOLaNZfsy6fXoq3n1Cz5xOugZ6ObLnAGOHhtj53B5cY5o5PVUqNcFYD5ohmiIuAxfn5aTUhSZT2HgYEzeWuOlJ78/7k8eW3LgitRODfPwf7n5x6Tn5fjDr3oDpP31paeetXzbVwSvpE8zAMmT+VbhKL6FJkCBCSx6MkDVS9u3YzhP37+O5nxwinm7QM6+Ty2+6igtefSmm3WJdWjzEIhiQoqCoFk/25NTCg4Aj4MDju/nB7d9j//OHILMsWtPHedecxukXrqFjoD8v1alDnUedJ/OWYOIg/uAPMMeHaU20n2hWznn3wXc+dOf6kefRMCPqOCO3rI49R7TqfGovv8XWf3TLu8rpvptNZ9PS2Y30n4sNuzB2GgREFLUpRoVtP93D7Z96iL3PHiYqW9acu5Jr33YtG645A1uNsVkLM+u+GeDQ2fgrXLpIcEiMaAzSontxL4tPW453KZMjYxzdP8GzTxxgcnya1RvmE4YKLsmZls8QV8dqCYdHm0MEcavNtXxf32/f/GCy9duTw09+j8/eszef9OfOhIF3vQyZc/qZwcH7vl4rHz9d+jN0ztlI71okCiACohACA6FHgir7do7xs+/votoZsPzMhSxdu4T2zhKqzYIphSgek3k0ENASiC++K8qcKnjyTGsMHjAoIiFxC47uOsGezUc5cWyMgcU9XPaqFZQCkNQhmaLeQ5YhMbi4gR59DI4fxg/XWlOlM//w6fc89vkLdnyLjuUbEJeNk+3+IdFpr7Mnv/iyD7e1nvlgqatpfX8PZs75+FoXEgpEJgdtAwg9ai0S1PBikAAkVLymmNShBKgRkJSpo9PseXaQVecuprO/BoQwy43Ap8qOTTsx6jlt41KoBIg6UEElBCOQBfjMIyZFXApphmQecT4HmyokHp+kMHEAf3gb9niLsWzhY81Fr3ijNIaPtPcuxV6/9RPU+sq0Dv9sZenoIx+uhCPzfHsAnUug0o9YjxiHGAfG5SlfHEiWF30aiG+ASxCXIhKj4hB1pOPT/OCfNnPPNzdzxoWL6J5bmU1QM/XTuybf+ftnefSufZy2rkZnX/lUmXEJkrYQ18BqHcnqmCwDl2dkNAWfgEshSyFL8N4gzSlMPI5ppn2aybbkW/dvmfOev8Bs/Jtn2ffGr+IHt15tdGoNoUFLZSRsR30LfBN8nB+uBb6BuhjNEtS1IKuDa4I2UN9EvSJap3lyhMfu3MKP795N2ZaptiueJmh+rmgTfAuxno52w9CBSf7l9k0MPn8YkhjvY1QTxLVQ38S7JqQpZC3EtcDFqEvAFeNyLciaSOYxYY20HCE2rdr6sRv0w39fHd50L/b3bjqP6u+/v012fO0PKjp0htQE09aHlDsRAYwiNn9HFEyaxx0CpoW+kFSQ4OOEkwdGePhb2/nx3QdwiWPV+XM5/5WLkCBF1CO4gmA4xELcaHDsmeMMD7Y4emCEnk5LZ4cnMAbUod6hPkPV5Zb0DjRGXV76yBykGaQpkqbgMjSeRJKUNM7aovGxH5hjm04EU7t/BqWdi4N4akMYpmBCxIaoz3JMPgTnwVkwgnoHkuaunJYwEoPUcSmMDsc8v+UETz18kuP76lQjodobsPGqBQRtMTYxOdDZBKXgU1Zs7GPRWW0M7ZjixO463/jCZs68oJcNF81h/pJOyuVSHrteUQLwMeoV9eRdlPfgHLgMfAqqWBOgRok0XVCvT5wf/Oy5LUH89O3UVl15epSOzaMMYgNUBO8TrM/ym/gAvCWLPQe3jRPHhvZuRxCUSRNhYnySwwfq7Nw6yYmjMdY4ujsNiGPF+Qs57ZxO1NXBRYVXFFm4qLBdnTXOf9VKfnj8aSpJyvS08NN7B3n2J0MsP63GitW99M+tUKkoVhzNRsr0hGXRsna6+yuFMbJTsescIgYVsJqGJhm+YPyDj/1jsOavGhz5y/PXB9KsJIElEouo5sGv+WzmNzNgDJuenuDH949QbVOiQBCnpEmKyzxhGNDdLkRVwZExZ9EAL3vdKqqlOtq0eGki+EJcnCk9YNKYtee1MXpkJc/eu4eO7pRKm6VR92x9YoItT4wThQFBkGtX9WZGua3C2967ku6+pBify2tvlqBOMSqIMfhAIZ46I9n21f5g5NnvVTVrrBU8YHFWCX0T40BNiJgcrDqLDSOueM0yWpR47vFjJPWMSuBpLweEJSWMMkIRXBiyYN0Al71mHQPzQOO0iNOicddZJ8agoBCI55LrFlItWTY9sgfGE7pDR3u7JYkNSexJWhmxRnQt6uSVr13D4lWCNltI5metKi7JXdn7QiTwQLqkvXlseTCx69Euk7SWeFECfF7jfDIboxhFXX6QKv0dnje8ZRH7Lunm+c2DDB+cIm3lcViululd0sXqDfNZdno7UbWBxr6oq/5F1px9ieZTkCiBbXD2dX0sXNfGnqeGObpzhKmxFkGqtEWGrt42lp7ex5oNffR0OEyjjmRauPALjxj1aT65At77rrQVrwl08ng3yXSvK+U81fgUXIq4EIzJs7FTcKCZIg0IysOsXltl5WlrmWo1aTZSUKi0lal2WYIggWwUadqf133kFKHItaicQBgsOEHSFvPnW+a8ZgGN+kKa4w3SJCWqhLR1RJStxydjSMNh4qjIKQ58lh/OIUU5UuNRAfGuJGm8PJC03h74pOKLQYgWvu9CsBbxUmQ9QVwubkgC6uoEJqazJHSVg7xMyQTaBNQiIohJQGwuOL0ArEiBEwVcYWAPHpQMTQyWmDbjaOsD8Sav5ekE0hBMFiLOotoCp3n5cRn4vEwZl6Ca4VVyL1JnJIv7gzhNyhYNtWhA1AOaoj5GfDkPLJ8nUfUKpBgkT17GY1XAJvnAjRYqfcGyZi6cOV+kqNcUffDMQ/OSpgDiEFWMNznZIsuvdSBqUVckTe9yqyo5ZXQ+r7s+yf/2ecZXFVSV2MdRkDk13s+QVckZkNditgXUgJfcsl7yrscD7pQ7CiBWCoU0K1JPfr2qP+WykOeCGbT5B3ma8lJ8bov75A1CHnTk7WExcNQjqjn4AhhFzVV1iPeFRXPLOoXUZQSipAquuEduCBWMmhysl3wghSvPDlIEkcJiqvm51rzoe7Rw2dnI1RccxTnYF7iUoBoW0rIiquiLxkFuiNlx6ilDFEZRdcVk5Od7lZknZoFRbeA1yUmIngI869I668p5TBUNuBSDF8lvPDN2LKjFZZAkjlbsaTZS4ljxmZClGeo91go2CAlLllLFUq0ZSpFgA4MxAjNh4AUtwOK1mNz8UOdnwTKbW1zh5rlx8qELRmgGqa9NRN5MZ84i3hUXenSWgwa5XXwRNyhOArxoLroZsCqos0w3lJHRhKOHm5w4ljE2Kkw3Q5yWsGEnxlbxAkYE1OPSJE8yWiewDSolR3e7pa+/xNx5Ad29AR3dIaXQIPiCG2egJp8ANeBtIfmQ82j1haXzHOO84MGjwWggpe4JJ3bE+7wKeEdeanwe7DiLmjxWxeTubEyaL7NqlWarxaFjGbt3xxw5bplyPZS6zqRj7goWrFtOX/9cOrt7Kdc6MUGUL1saA97jMkcWxzTrE9SnRpiaGGV0ZJB9w0fY9rODEI9Sax9hTrdj6fwSA/0B7Z0RQZDmQeFLGI3BBaizeD8NzudAHXiveA+Zs6kSHgs6l105NXn8rsMll3/hvOQLTZkDaSLG5jzThKgzqAT4TBidcuzZP8WuXYaxrJfqorNYcOUFnLV0Jd09/VQqHURRBRORS6/WYKzBquRcpSCNmQFVKZIhuMzRajWoT48zdnKYoQP7OXFoG/u2bkWbxxjonmDVsoCFc6Gr5nIuQILRFqLTiHMYL7jiyDLwrtQwUcdBAXj6g4s/1pke+19dbZ6oXSiVFYk8NgyQsAOiKhpV8EGFk3V4atMkT22tE/WdxqqLXs/cVevp6JtDVCpjQsFaS2AtgQ0IA4s1BmsDjC3qrwgzy+8en3MrFRSD84rzDu+z/D3NyOIWzelJxkeGGDq8k4lje0lGn6UzOs7qBbBifkIlHkOaExCnEEMaGxqxZ3paaNX7dpsll90YPPlWiIK27S62caK+FDpFvWJdXvPUthBXwkvM3kMl/uXuQU4MjRFLxOolbQwsWU65q59EHTaOEVdCoxivgvNRzsSsojZATYQxBmMMzuRg8+VamaWRvigZOWNzJC7BoUi5RvvAYirdc0lWnkdj6joOb32Yb999KzdcFrFxRVwkppkJy8M7y5Q0Kh+oDKwbDMrLzsVUOrcn9WNDmiaLZmq1sWC85gTbxOCFLG2SpU1CAeNSDj77I1o2YP2FN6LG0ZwcJatPkiVxriz4FlY8EKHGEpUsYVjD2hJhWM49odZGWKpRqrYTlavYqEpUrhFEFbBBvraL4L2QOfDOgUC5vZ2Oji7EWAJjMEXCccX4s0zxieLTAFfr3LzkNz46EUQrLyYr9R3IRndvy5LJRVkGNlOCQMAbxHvEN5HEsHJJJ29660r27Ys5sHeCifEpzNCjDD26h/YeKEewb88401NjnLa6l3nzalhJeXrzCPVGyllnzUfjiCxTWq2MofFphodbxGmEN2XEBpiwgo2q2KiNUq2LsNpDraufWvccyu3dVNq6CcoVnM84uHMT3dUWi+aX0DTLSYUH7wWXCVkKqVan0/YlP/nB27t80LXqYj5//hsn3vSn6x6Mp8JXhFlmA6c4B2IM1jkwCeJKmGyMhe1lFpxb5ez1faRxP4IQhJ5qzTAxFnFk71EuuqCdC87roVQKwSjNRDhxYoxLLxnAWodKhvdKq1VhaDBjx3NDHDt8JHe/tJCUnFDPIHWGQQ1xUkZslVK1m3LPAEG1Rn3/Ji7bUKGjOonWHR7Bq+KckmVCmgoatO2M5p22aWH3APZTX/pnOvUewt5lTTMxeK2YVrcJhNAoGlqM0dltEAaTa0gupmwd1chTKltKJYc1woGDMWPjdV72soXUqq5IPxGjJx21asSCRSGeVk7pxBOGQk93hfkLuwClMR0ThFApQ1sZOqqGjqrQUc1or8RUw2lCN0xr4giNob2sX265cGNIxASkad6ZJkVySiBpBerblt229nfvuKuanNBADz3IvPNuwM7buOPE4Lb7icffaSMwoaXiMpzJKZfxDvEO9fn2HjJFjUM1Q7xAYGlMN1kwr4v2qs1FL5NnnFopY8FAF4aCsyKnmJmm1CqWc85dSnt7G1u2HiFueiRwiHUYD1YglILIeaGSGhbP6+SCjYaybeAShzjFOSHNhCzxaKxk0nbUdi/73pb3r/XrP7WDQBZfwfzFl3Dv27pbPWuv+oY/PvKqsDk5X0sBYZoiuZSEGvL4dYrHFeurBhEQDUAMtQrUauRqAcXocCxZ3EEQWshiZpjqzHqPYFCfEBrHunVdlNsinvjJQSYnBBtYApthJcCIgjgqYZnTV5dZvbRKxU6jmcuZkoPMQ5oa0lSJE6FZW3j/io2vfra5aC164IGcCY4/8RVO7N9JOLC2OnzfJ/6yu7nrnbYLqbQr1ZJiSoqJDCaIsKaEsRas5IzKlrBi0QBaWQ3FUSl7REt4owj2FNlGZlvbGcFNVEDAq0cNYCqMjjm2bxvm4MFxGo28pWyrWRYt6mDF4jZ6uhKsT/MtRVmGz5qkrYykDvGkoTktNH3bUVZc/5Zjj//Tg9d8RfP6DqDxEET9PPzWEn3rX3G+Hvrx7aVoYnXUFVCpeqKyx4Rgg4DQVjCBBQMSCJgQYyxiDMwsVwBIgBozK71I0QzqbB//ArCzts5dW8XgfMDYRIupCY/PUjqqAV0dAYFpgU9Ql6HaQlNDGsckrYzWtNKcMrgp67OudV+c/7Yv/lG8f1OzZ+5aotOuOaWaxDu+w+jgEF1X/law4wMbfy+Yfv6jpbasWunwlKoQlDR3q6CUbwaxzFrYiMWIzVUJE+aARPMdG1JwpRmTzsoyM2BfbOmiL0OV/DpDrmG7DNTj89qSu26WkcUZcSsmaXriacVNwKRd/nR1/RveNrrtgS0X/e+fkaonMi+QiMZU2fX+tYRzV1Kef8ac5ubbPxdkw28o17xU25Sw6gkjizUWGwTYMESswViPiMmti0UkykGa3C2FMG8Df5H+9IK3GQqlM415AQiZacTzw5PgneJTJU0cSdIiaaXEdaE1bYiT6qhdevUfnPE7d/7j+MmjviOoY7vzzWCz2/m6RWiNH6fUOcC3r5Ghxddd98n4yBMrpDF+nliPGkVEIXBFPxsUy/YeawrFUPLBiVpQkzfUeV+Y73kS8oafFwOcxTwDEofHo+JzOUg1/1sVzcBnnixxZElCEqfELSVuCs24lCS9Z3xl3Q2//a1DP/wrn0Qr6Lrw0tlH/Zz4N7bnhzSnYuZvvJ6n/vTiV+r4c5+LStNrOioeqVlKZQgjQQIhCKLcyibnuGIEMXmGFRMApnBlk8sqRfbmRSL5rKaC4gt1wudr8aqQgS8mwDmHz5Qs9bhEyZKMVguShpBNGtfsOO2bcy968/tHdjxw7Dfedz9bXJ3Q1v5tsOpG2PntLxI6x/Jf/4j56QfPem2pvusvghLLw5qjWk6JymAiCIIAay02sHl5sDYHayi6G80TlkielYty9CLjis4CVvWzOpMv3Fidx3uP8x7nPM45skTJYkhiSJoWN4WvR8v+pbrx195/9L7P733lbZO4+lGCtoUvwvYLt/Np4xC7vvwBfKXG4tffYrd+8sqbKpP7/7wUNVaYNggrEJbBhpYg8EVLF2FsWFiYnHkJiFHMjF71wqcWUqqg+T8teIbPm+5TgDOcU1ymZJknyyBLhKwlpE0lnQ5co7z0ruqZr/nj7bd/atev36eko1uJetf/HK5/c++ijhxm062/RaVrPmtv/jv79J9d8Crqe24Jg8YZ5arHlpUgMoSRJwjABgZrTdHC2VOH+FxBNXl8v9CseQb2BUhTKIEur7mFNb3T3HUzwWVKmghpC5KmIW7ZJKusuCNce/2Hnv67T+99x2NK8+jTVBee8wsx/bu7UnViJ1v/4Q8pDaxk9Zs+LU99/IpLsuHtHy6b8SvLpSygaiiFShiAiTwSkAtps4ANVhRjCgLCTL3VWbCKRz2FviuFlOLz1tTnFnWO3HVTQ9qySD1jwnVNZD2rbl1wzg2f2X7nXx677tZxWsc2U55/BiLhSwcLkE0dYu93P0+lbzn/9Ip3cdlf/+ZyPfbEe8qNwTeVwmZ/EIVQVWyUUbKKDRQTFFKMKULWSBHDMwtNhcvmKRz1MuvGfrZNy0V+TUKyLMspYEtwzdDXS/1bzMCaL8y97D3/9+SDn586948eoDX4DJX5Z/+7WH6p3who8ziDj/wz8866hrs+dDVnvOGDtcFHv3FtOLbzXWU/cbFUkoote8LAEoRgrcdYzQWAmSzNDOhTVs11YpkVs70HnC8acMFl+YK6xp64GZK69iNJbe4dpZVX3nrOO76wbfsdH9NPvf7D3Dq5D/tLbJ//pbbNS2UuAK2jj/GaLx3lucufr3/6I4/cccuX3vb42OFtN+rU0d+oNU9uzEJfNZEShgYb5lYW+2LLmllufEpw96qziYkMfCq4GUKfWlpSHUyqi3/Q2bf2q2svf+dPn/zGB5pTB5+l0rmE29xRxC74ZWC89F9/aHycwQe/xsDZ1/L0l9/HuX98H9s+95aFjaPbrk7jE68xTF8QSjJQsokNAoUApCi5IiYvQLOuLKjaHKRzBTMSMmeJtdJ0Ut7jKgseqPUsvGvuRa976icfevv0+e/7LIte9bv4Yz/DDJyFBOVfeuwv6dcfAFLKrawTVyPdp3Fi6/dx9RNHdn3qmX9c/7X33zl54Jk19cnhCyUeu8i2WmeWXLIgNGl7oEkYiCfOl2zylxdElQyrqZTjjHDU2+o+H7U/rd1Lf1Kbu/rJ9W/93KEn39Geda8+m5seVFr7H4XkEHbBhS916L/6j5hmLX1sD/se+CQLz34dOx+/gxO7n+D5r2/h8r/9u/KJLffNj+KhNc6n60Pjz4qC8IzQlBchlNT7lqZ+KEb3ZxLs0rDynIkq22TOur2Xvvljw7ffJG751W9h6VmXseDid+COPoIdWI+Ev9oPmAD+FSRHGpvh2wEsAAAAAElFTkSuQmCC" alt="silly"/>
  </CardTitle>
  <CardDescription class="text-center">Enter your credentials to access the dashboard.</CardDescription>
</CardHeader>

<CardContent>
  <form on:submit|preventDefault={handleLogin} class="space-y-4">
    <div class="space-y-2">
      <Label for="username">Username</Label>
      <Input id="username" type="text" bind:value={username} disabled={loading} required />
    </div>
    
    <div class="space-y-2">
      <Label for="password">Password</Label>
      <Input id="password" type="password" bind:value={password} disabled={loading} required />
    </div>

    <Button type="submit" class="w-full" disabled={loading}>
      {#if loading}
        <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
        Wait a sec...
      {:else}
        Sign In
      {/if}
    </Button>
  </form>
</CardContent>

<CardFooter class="justify-center text-xs text-muted-foreground">Silly version: {version}</CardFooter>

