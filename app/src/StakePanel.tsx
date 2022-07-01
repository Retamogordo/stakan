import React from 'react'
import {RevolvingDot} from "react-loader-spinner"

class StakePanel extends React.Component {
    props: any;
    loader: any;
    constructor(props: any) {
        super(props);

        this.props = props;
        this.loader = {
            Component: RevolvingDot,
            props: {
              color: "#0ead69",
              height: 100,
              width: 110
            },
            name: "RevolvingDot"
          };
    }

    render() {
        const props = this.props;

        const style = {background: 'rgba(20, 19, 19, 0.5)'} 
         
        return props.visible ?
            (
                <div className='control-panel' style={style}>
                    <div className='header'></div>
                    <div>
                        <input type='button' 
                            value={this.props.startButtonLabel} 
                            disabled={this.props.startButtonDisabled || this.props.loadingMode}
                            onClick={this.props.onStartSessionClick}>
                        </input>
                    </div>
                    <div>
                        <input type='button' value='Delete User' disabled={true} onClick={this.props.onDeleteUserClick}></input>

                    </div>
                    {this.props.loadingMode 
                        ? <this.loader.Component {...this.loader.props}/>
                        : null
                    }

                </div>
            )
            :
            null
    }
}

export default StakePanel;