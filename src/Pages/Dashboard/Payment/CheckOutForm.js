import { CircularProgress } from '@mui/material';
import { CardElement, useElements, useStripe } from '@stripe/react-stripe-js';
import React, { useEffect, useState } from 'react';
import useAuth from '../../hooks/useAuth';

const CheckOutForm = ({appointment}) => {
    const {price, name, _id} = appointment || {};
    const {user} = useAuth();
    const stripe = useStripe();
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [processing, setProcessing] = useState(false)
    const elements = useElements();
    const [clientSecret, setClientSecret] = useState('');
    useEffect(()=>{
        fetch('http://localhost:5000/create-payment-intent',{
            method:'POST',
            headers:{'Content-Type': 'application/json'},
            body:JSON.stringify({price})
        })
        .then(res=>res.json())
        .then(data=>setClientSecret(data.clientSecret))
    },[price])

    const handleSubmit = async (e) =>{
        e.preventDefault()
        if(!stripe || !elements){
            return;
        }
        setProcessing(true)
        const card = elements.getElement(CardElement)
        if(card === null){
            return
        }
        const {error, paymentMethod} = await stripe.createPaymentMethod({
            type:'card',
            card
        });
        if(error){
            setError(error.message);
            setSuccess('')
        }
        else{
            console.log(paymentMethod)
            setError('')
        }

        // Payment intent

        const {paymentIntent, error: intentError} = await stripe.confirmCardPayment(
            clientSecret,
            {
              payment_method: {
                card: card,
                billing_details: {
                  name: name,
                  email:user?.email
                },
              },
            },
          );
          if(intentError){
              setError(intentError.message);
              setSuccess('')
          }
          else{
              setError('');
              console.log(paymentIntent);
              setSuccess('Your Payment processed successfully.');
              setProcessing(false);
            //   save to DB
            const payment = {
                amount:paymentIntent?.amount,
                created : paymentIntent.created,
                last4: paymentMethod?.card?.last4,
                transactionId: paymentIntent?.client_secret.split('_secret')[0]
            }
            const url = `http://localhost:5000/appoinments/${_id}`;
            fetch(url,{
                method:'PUT',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify(payment)
            })
            .then(res => res.json())
            .then(data => console.log(data))
          }
    }
    return (
        <>
        <form onSubmit={handleSubmit}>
            <CardElement
                options={{
                    style: {
                        base: {
                            fontSize: '16px',
                            color: '#424770',
                            '::placeholder': {
                                color: '#aab7c4',
                            },
                        },
                        invalid: {
                            color: '#9e2146',
                        },
                    },
                }}
            />
            {processing ? <CircularProgress></CircularProgress>:<button type="submit" disabled={!stripe || success}>
                Pay ${price}
            </button>}
        </form>
        {
            error && <p style={{color:'red'}}>{error}</p>
        }
        {
            success && <p style={{color:'green'}}>{success}</p>
        }
        </>
    );
};

export default CheckOutForm;