import React, { useRef, useEffect, useState, useReducer } from 'react'

function isInside(pos, rect) {
    return pos.x > rect.x && pos.x < rect.x+rect.width && pos.y < rect.y+rect.height && pos.y > rect.y
}

function getMousePos(canvas, e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left) / (rect.right - rect.left) * canvas.width,
        y: (e.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height
    };
}

class CanvasButton extends React.Component {

    constructor(props) {
        super(props)
        const { id, canvas, x, y, width, height, label, color, visible, onClicked, ...rest } = props

        this.id = id;
        this.canvas = canvas;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.label = label;
        this.onClicked = onClicked;
        this.color = color;
//        console.log(visible)
        this.visible = visible === undefined ? true : visible;

        this.draw = this.draw.bind(this)
        this.setParentCanvas = this.setParentCanvas.bind(this);
        this.handleParentClick = this.handleParentClick.bind(this);

//        console.log("in constructor: ", this);
    }

    setParentCanvas(canvas) {
        this.canvas = canvas;
        if (this.onClicked) {
            canvas.addEventListener('click', this.handleParentClick);
        }
        this.draw();
    }

    setVisible(visible) {
        if (this.visible !== visible) {
            this.visible = visible;
            this.draw();
        }
    }

    handleParentClick(e) {
        if (!this.visible) return;

        const {x, y} = getMousePos(this.canvas, e);

        if (isInside( {x, y}, {x: this.x, y: this.y, width: this.width, height: this.height})) {
            this.onClicked();
//            console.log("clicked inside")
        }
        else {
            console.log("missed");
            this.onClicked();
        }
    }

    draw() {
        const canvas = this.canvas;
//        console.log("canvas in button draw: ", canvas);
        if (canvas === null) return;

        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = 'rgb(0, 0, 0, 0.0)';
        //active ? 'pink' : 'lightgray';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        ctx.strokeStyle = this.visible 
            ? (this.color ? this.color : 'black')
            : ctx.fillStyle;

        ctx.beginPath();       
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.lineTo(this.x + this.width, this.y);
        ctx.lineTo(this.x, this.y);
        ctx.stroke();
      
        // Button text
        ctx.font = 'IBM Plex Mono';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = this.visible 
            ? (this.color ? this.color : 'black')
            : ctx.fillStyle;
            //        ctx.fillStyle = active ? 'blue' : 'black';
        ctx.fillText(this.label, this.x + this.width / 2, this.y + this.height / 2);
    }

    componentWillUnmount() {
        this.canvas && this.canvas.removeEventListener('click', this.handleParentClick);
    }

    render() {
        this.draw();
        return;
//        return <button type={"button"} id={this.id}>{this.label}</button>
    }
}
//const CanvasButton = props => {
/*
const CanvasButton = React.forwardRef((props, ref) => {
    const { id, canvas, x, y, width, height, label, ...rest } = props


    useEffect(() => {
        draw()
    },
    [])

    return (
        <button type={"button"} id={id} ref={ref}>{label}</button>
    )  
})
*/
export default CanvasButton;