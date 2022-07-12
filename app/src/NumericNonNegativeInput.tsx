import React, { useState, useEffect, useRef } from 'react'

export const NumericNonNegativeInput = (props: any) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const buttonRef = useRef<HTMLInputElement>(null);
    const [inputValue, setInputValue] = useState(0);

    const handleButtonClick = () => {
        props.onInput && props.onInput(inputValue);
    } 

    const handleInputChange = () => {
        const val = inputRef.current ? parseInt(inputRef.current?.value) : 0;

        setInputValue(val)
        props.onInputValueChanged && props.onInputValueChanged(val)
    } 

    useEffect(() => {
        props.inputFieldChanged && props.inputFieldChanged(inputValue);
    },
    [inputValue]);

    return (
        props.visible 
        ?
        <div className='numeric-input'>
            <input type='number'
                min='0'
                max={props.max}
                value={props.value} 
                disabled={props.disabled}
                onChange={handleInputChange}
                ref={inputRef}
            >                    
            </input>
            <span>{inputValue > 0 ? props.fieldLabel : ''}</span>
            <div>
                <input type='button' ref={buttonRef}
                    disabled={props.disabled || !inputValue || inputValue <= 0}
                    value={props.buttonText}
                    onClick={handleButtonClick}
                >
                </input>
            </div>
        </div>
        :
        null
    )
}
