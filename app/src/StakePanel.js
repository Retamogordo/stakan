import React, { useState, useRef, useEffect, useCallback } from 'react'

class StakePanel extends React.Component {
    
    constructor(props) {
        super(props);
//        this.visible = true;
    }

    render() {
        const props = this.props;

//        console.log("Panel render, visible: ", props.visible);
//        const background = props.visible ? 'rgba(20, 19, 19, 0.396)' : 'rgba(20, 19, 19, 0.0)'
        const style = props.visible ? {background: 'rgba(20, 19, 19, 0.396)'} 
            : {background: 'rgba(20, 19, 19, 0.0)'}
        return (
            <div className='stake-panel' style={style}>
            <div className='header'></div>
            <div>
                <input type='button' value='Start' onClick={props.onStartSessionClick}></input>
            </div>
            <div>
                <input type='button' value='Stop' onClick={props.sendStopSessionClick}></input>
            </div>
            </div>
        )
    }
}

export default StakePanel;